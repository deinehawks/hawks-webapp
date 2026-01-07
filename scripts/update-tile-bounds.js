require("dotenv").config({ path: ".env.local" });

const fs = require("fs").promises;
const path = require("path");
const { parseString } = require("xml2js");
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables!");
  console.error(
    "Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Base path to your tiles directory
const TILES_BASE_PATH = path.join(__dirname, "../public/tiles");

/**
 * Parse tilemapresource.xml and extract bounding box
 */
async function parseTileMapResource(xmlPath) {
  try {
    const xmlContent = await fs.readFile(xmlPath, "utf-8");

    return new Promise((resolve, reject) => {
      parseString(xmlContent, (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          const bbox = result.TileMap.BoundingBox[0].$;
          resolve({
            minx: parseFloat(bbox.minx),
            miny: parseFloat(bbox.miny),
            maxx: parseFloat(bbox.maxx),
            maxy: parseFloat(bbox.maxy),
          });
        } catch (parseErr) {
          reject(new Error("Invalid BoundingBox format"));
        }
      });
    });
  } catch (error) {
    throw new Error(`Failed to read XML file: ${error.message}`);
  }
}

/**
 * Get file modification time
 */
async function getFileModifiedTime(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtime;
  } catch (error) {
    return null;
  }
}

/**
 * Find all tilemapresource.xml files in the tiles directory
 */
async function findTileMapResources() {
  const tileMaps = [];

  try {
    const surveyDirs = await fs.readdir(TILES_BASE_PATH);

    for (const surveyCode of surveyDirs) {
      const surveyPath = path.join(TILES_BASE_PATH, surveyCode);
      const stat = await fs.stat(surveyPath);

      if (!stat.isDirectory()) continue;

      const years = await fs.readdir(surveyPath);

      for (const year of years) {
        const yearPath = path.join(surveyPath, year);
        const yearStat = await fs.stat(yearPath);

        if (!yearStat.isDirectory()) continue;

        const surveyIds = await fs.readdir(yearPath);

        for (const surveyId of surveyIds) {
          const xmlPath = path.join(
            yearPath,
            surveyId,
            "ortho",
            "sharp-corners",
            "tilemapresource.xml"
          );

          try {
            await fs.access(xmlPath);
            const modifiedTime = await getFileModifiedTime(xmlPath);

            tileMaps.push({
              surveyCode,
              year,
              surveyId,
              xmlPath,
              modifiedTime,
            });
          } catch {
            // File doesn't exist, skip
          }
        }
      }
    }
  } catch (error) {
    console.error("Error scanning tiles directory:", error);
  }

  return tileMaps;
}

/**
 * Check if survey needs updating
 */
async function needsUpdate(surveyId, xmlModifiedTime, bounds) {
  const { data, error } = await supabase
    .from("surveys")
    .select(
      "tile_min_x, tile_max_x, tile_min_y, tile_max_y, tile_bounds_updated_at"
    )
    .eq("id", surveyId)
    .single();

  if (error) {
    // Survey doesn't exist in database
    if (error.code === "PGRST116") {
      return { needsUpdate: false, reason: "survey_not_found" };
    }
    throw error;
  }

  // No tile bounds yet - needs update
  if (
    !data.tile_min_x ||
    !data.tile_max_x ||
    !data.tile_min_y ||
    !data.tile_max_y
  ) {
    return { needsUpdate: true, reason: "missing_bounds" };
  }

  // Check if bounds have changed
  const boundsChanged =
    Math.abs(data.tile_min_x - bounds.minx) > 0.0000001 ||
    Math.abs(data.tile_max_x - bounds.maxx) > 0.0000001 ||
    Math.abs(data.tile_min_y - bounds.miny) > 0.0000001 ||
    Math.abs(data.tile_max_y - bounds.maxy) > 0.0000001;

  if (boundsChanged) {
    return { needsUpdate: true, reason: "bounds_changed" };
  }

  // Check if XML file is newer than last update
  if (data.tile_bounds_updated_at && xmlModifiedTime) {
    const lastUpdate = new Date(data.tile_bounds_updated_at);
    if (xmlModifiedTime > lastUpdate) {
      return { needsUpdate: true, reason: "xml_modified" };
    }
  }

  return { needsUpdate: false, reason: "up_to_date" };
}

/**
 * Update survey record in Supabase with tile bounds
 */
async function updateSurveyBounds(surveyId, bounds) {
  const { data, error } = await supabase
    .from("surveys")
    .update({
      tile_min_x: bounds.minx,
      tile_max_x: bounds.maxx,
      tile_min_y: bounds.miny,
      tile_max_y: bounds.maxy,
      tile_bounds_updated_at: new Date().toISOString(),
    })
    .eq("id", surveyId)
    .select();

  if (error) {
    throw new Error(`Supabase update failed: ${error.message}`);
  }

  return data;
}

/**
 * Main execution function
 */
async function main(options = {}) {
  const { forceUpdate = false } = options;

  console.log("🔍 Scanning for tilemapresource.xml files...\n");

  const tileMaps = await findTileMapResources();

  console.log(`📋 Found ${tileMaps.length} tilemapresource.xml files\n`);

  if (tileMaps.length === 0) {
    console.log(
      "No tilemapresource.xml files found. Please check your tiles directory structure."
    );
    console.log(`Expected path: ${TILES_BASE_PATH}`);
    return;
  }

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;

  for (const tileMap of tileMaps) {
    try {
      console.log(
        `Processing: ${tileMap.surveyCode}/${tileMap.year}/${tileMap.surveyId}`
      );

      // Parse XML
      const bounds = await parseTileMapResource(tileMap.xmlPath);
      console.log(
        `  📍 Bounds: [${bounds.minx.toFixed(6)}, ${bounds.miny.toFixed(
          6
        )}] to [${bounds.maxx.toFixed(6)}, ${bounds.maxy.toFixed(6)}]`
      );

      // Check if update is needed (unless force update)
      if (!forceUpdate) {
        const updateCheck = await needsUpdate(
          tileMap.surveyId,
          tileMap.modifiedTime,
          bounds
        );

        if (!updateCheck.needsUpdate) {
          if (updateCheck.reason === "survey_not_found") {
            console.log(`  ⚠️  Survey not found in database - skipping\n`);
            notFoundCount++;
          } else {
            console.log(`  ⏭️  Already up to date - skipping\n`);
            skippedCount++;
          }
          continue;
        }

        console.log(`  🔄 Update needed: ${updateCheck.reason}`);
      }

      // Update database
      await updateSurveyBounds(tileMap.surveyId, bounds);
      console.log(`  ✅ Updated in database\n`);

      successCount++;
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}\n`);
      errorCount++;
    }
  }

  console.log("═════════════════════════════════════");
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`⏭️  Skipped (up to date): ${skippedCount}`);
  console.log(`⚠️  Skipped (not in DB): ${notFoundCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`Total processed: ${tileMaps.length}`);
  console.log("═════════════════════════════════════");
}

// Parse command line arguments
const args = process.argv.slice(2);
const forceUpdate = args.includes("--force") || args.includes("-f");

if (forceUpdate) {
  console.log("🔄 Force update mode enabled - will update all surveys\n");
}

// Run the script
main({ forceUpdate }).catch(console.error);
