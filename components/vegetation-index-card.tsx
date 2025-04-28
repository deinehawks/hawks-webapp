import { vegetationIndices } from "@/data/vegetation-indices";
import { useSurveyMapStore } from "@/providers/survey-map-store-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CircleAlertIcon, CircleCheckIcon, CircleXIcon } from "lucide-react";

function ValueStatusIconIndicator({ value }: { value: number }) {
  if (value <= 0) {
    return <CircleXIcon className="size-4 text-destructive" />;
  }
  if (value > 0 && value < 0.4) {
    return <CircleAlertIcon className="size-4 text-warning" />;
  }
  if (value > 0.4) {
    return <CircleCheckIcon className="size-4 text-success" />;
  }
  return null;
}

export function VegetationIndexCard() {
  const { selectedVegetationIndex } = useSurveyMapStore((state) => state);

  const index = vegetationIndices.find(
    (index) => index.code.toLowerCase() === selectedVegetationIndex
  );

  if (!index) return null;

  return (
    <div className="flex flex-1 my-2 flex-col gap-4">
      <CardHeader>
        <CardTitle> {index.code} </CardTitle>
        <CardDescription> {index.name} </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div>{index.description}</div>
          {/* <div>{index.formula_description}</div> */}

          <Table className="w-full table-auto text-left">
            <TableCaption>{index.formula}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead colSpan={2}>
                  {" "}
                  Calculated {index.code} Values
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium"> Mean </TableCell>
                <TableCell>
                  <div className="flex justify-between items-center">
                    <div>{`<mean-value>`}</div>
                    <ValueStatusIconIndicator value={0} />
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium"> Median </TableCell>
                <TableCell>
                  <div className="flex justify-between items-center">
                    <div>{`<median-value>`}</div>
                    <ValueStatusIconIndicator value={0.25} />
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium"> Mode </TableCell>
                <TableCell>
                  <div className="flex justify-between items-center">
                    <div>{`<mode-value>`}</div>
                    <ValueStatusIconIndicator value={0.5} />
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-xs text-destructive/85">unhealthy</span>
              <span className="text-xs text-success/85">healthy</span>
            </div>
            <div className="w-full h-3 bg-gradient-to-r from-red-800 via-yellow-300 to-green-600"></div>
          </div>
        </div>
      </CardContent>
    </div>
  );
}
