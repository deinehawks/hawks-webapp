"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MapPinned, Cuboid, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ThreeDimensionalModelCard } from "@/components/3d-model-card";
import { ortho } from "@/data/orthomosaic";

interface SurveyDataTabSurvey {
  code?: string | null;
  ortho?: unknown;
  point_cloud?: unknown;
}

interface OrthoTabContentProps {
  survey: SurveyDataTabSurvey;
}

export function OrthoTabContent({ survey }: OrthoTabContentProps) {
  const hasOrthoData = survey.ortho != null;

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
        {ortho.map((item) => (
          <div key={item.name} className="space-y-4">
            <h3 className="text-sm font-semibold">{item.name}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
            <Separator />
          </div>
        ))}

        {!hasOrthoData && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Data unavailable</AlertTitle>
            <AlertDescription>
              This survey doesn&apos;t have orthomosaic data available yet.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

interface ThreeDTabContentProps {
  survey: SurveyDataTabSurvey;
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
              <div className="relative min-h-75 rounded-lg bg-card/50 p-4">
                <ThreeDimensionalModelCard />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
