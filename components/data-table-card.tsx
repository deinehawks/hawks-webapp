import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DataTableCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Survey Data Table</CardTitle>
        <CardDescription>
          An interactive table listing all the stakeholder&apos;s survey data.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
