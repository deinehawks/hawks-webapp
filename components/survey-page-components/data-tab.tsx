// Updated data-tab.tsx
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, MapPinned, Cuboid, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ThreeDimensionalModelCard } from "@/components/3d-model-card";

interface OrthoTabContentProps {
  survey: any;
}

export function OrthoTabContent({ survey }: OrthoTabContentProps) {
  const hasOrthoData = (survey as any).ortho != null;

  return (
    <Card className="h-full border-0 shadow-none">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <MapPinned className="h-4 w-4 text-primary" />
              </div>
              <span>Orthomosaic View</span>
            </CardTitle>
            <CardDescription className="text-sm">
              High-resolution aerial imagery
            </CardDescription>
          </div>
          <Badge
            variant={hasOrthoData ? "default" : "secondary"}
            className="shrink-0"
          >
            {hasOrthoData ? "Available" : "No data"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* What you're viewing */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            About this view
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            An orthomosaic is a geometrically corrected aerial image created by
            stitching together multiple photographs. It provides an accurate,
            distortion-free top-down view of the surveyed area.
          </p>
        </div>

        <Separator />

        {/* Status or features */}
        {!hasOrthoData ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Data unavailable</AlertTitle>
            <AlertDescription>
              This survey doesn't have orthomosaic data available yet.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Disease Detection</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Computer vision algorithms analyze the orthomosaic to identify
                banana plants and detect signs of disease. Early detection
                enables timely intervention to prevent crop losses.
              </p>
            </div>

            {/* You could add more sections here */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tip
              </p>
              <p className="text-sm">
                Use the Feature of Interest selector above to filter between
                healthy and infected plants on the map.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ThreeDTabContentProps {
  survey: any;
}

export function ThreeDTabContent({ survey }: ThreeDTabContentProps) {
  const hasPointCloud = survey.point_cloud != null;

  return (
    <Card className="h-full border-0 shadow-none">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Cuboid className="h-4 w-4 text-primary" />
              </div>
              <span>3D Model View</span>
            </CardTitle>
            <CardDescription className="text-sm">
              Three-dimensional terrain visualization
            </CardDescription>
          </div>
          <Badge
            variant={hasPointCloud ? "default" : "secondary"}
            className="shrink-0"
          >
            {hasPointCloud ? "Available" : "No data"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* What you're viewing */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            About this view
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            A 3D model provides volumetric representation of the surveyed area,
            allowing you to visualize terrain elevation, vegetation structure,
            and spatial relationships in three dimensions.
          </p>
        </div>

        <Separator />

        {/* Point cloud section */}
        {!survey.code ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Missing survey code</AlertTitle>
            <AlertDescription>
              A survey code is required to load 3D models.
            </AlertDescription>
          </Alert>
        ) : !hasPointCloud ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Processing in progress</AlertTitle>
            <AlertDescription>
              The 3D point cloud for this survey is not yet available. It may
              still be processing.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Model Details</h3>
              <div className="relative min-h-75 rounded-lg border bg-card p-4">
                <ThreeDimensionalModelCard pcd={survey.point_cloud as any} />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md bg-background p-2 border">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Tip
                  </p>
                  <p className="text-sm leading-relaxed">
                    Use your mouse to rotate, pan, and zoom the 3D model in the
                    main view. Switch between different model types using the
                    selector above, and toggle the axis helper for spatial
                    orientation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
