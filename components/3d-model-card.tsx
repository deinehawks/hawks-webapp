import { three_dimensional_models } from "@/data/3d-models";
import { useSurveyMapStore } from "@/providers/survey-map-store-provider";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ThreeDimensionalAxesHelperSwitch } from "./selectors/3d-model-selector";

export function ThreeDimensionalModelCard() {
  const { selected3dModel } = useSurveyMapStore((state) => state);

  const model = three_dimensional_models.find(
    (model) => model.code.toLowerCase() === selected3dModel
  );

  if (!model) return null;

  return (
    <div className="flex flex-1 my-2 flex-col gap-4">
      <CardHeader>
        <CardTitle>{model.name}</CardTitle>
        <CardDescription>Generated using {model.source}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div>{model.description.split(".").at(0)}&#46;</div>
          <div>{model.description.split(".").at(1)}&#46;</div>

          {(selected3dModel === "pcd-lidar" ||
            selected3dModel === "pcd-odm") && (
            <Table className="w-full table-auto text-left">
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium"> No. of Points </TableCell>
                  <TableCell> 123,456 </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}

          <ThreeDimensionalAxesHelperSwitch />
        </div>
      </CardContent>
    </div>
  );
}
