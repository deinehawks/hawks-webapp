"use client";

import { TableColumnHeader } from "@/components/data-table/column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  RowSelectionState,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
  BananaIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CircleCheckIcon,
  CircleXIcon,
  ColumnsIcon,
  MoreVerticalIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Tabs } from "./ui/tabs";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import Map, { Layer, Marker, Source } from "@vis.gl/react-maplibre";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";
import { findExtremeCoordinates } from "@/lib/helpers";
import { TableFacetedFilter } from "./data-table/faceted-filter";
import { title } from "process";
import { survey_data_types } from "@/data/survey-types";
import Link from "next/link";

export const schema = z.object({
  id: z.string(),
  code: z.string(),
  area_code: z.string().length(4),
  flight_date: z.date(),
  location: z.string(),
  area: z.number(),
  tags: z.string().array(),
  min_x: z.number(),
  max_x: z.number(),
  min_y: z.number(),
  max_y: z.number(),
  geojson_boundaries: z.string().array(),
});

function includesStringFilter(row: any, key: string, filterValue: string[]) {
  for (let value of filterValue) {
    if (!row?.original[key].includes(value)) {
      return false;
    }
  }
  return true;
}

const columns: ColumnDef<z.infer<typeof schema>>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllRowsSelected() ||
            (table.getIsSomeRowsSelected() && "indeterminate")
          }
          disabled={!table.getIsSomeRowsSelected()}
          onCheckedChange={() => table.toggleAllRowsSelected()}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          className="cursor-pointer"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value);
          }}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: ({ column }) => <TableColumnHeader column={column} title="ID" />,
    cell: ({ row }) => {
      // const id: string = row.getValue("id");
      // return <div> {id.toUpperCase()} </div>;
      return <TableCellViewer survey={row.original} />;
    },

    enableHiding: false,
  },
  {
    accessorKey: "area_code",
    header: ({ column }) => (
      <TableColumnHeader column={column} title="Area Code" />
    ),
  },
  {
    accessorKey: "flight_date",
    header: ({ column }) => (
      <TableColumnHeader column={column} title="Flight Date" />
    ),
    cell: ({ row }) => {
      return <div> {format(row.getValue("flight_date"), "dd MMM yyyy")} </div>;
    },
  },
  {
    accessorKey: "location",
    header: ({ column }) => (
      <TableColumnHeader column={column} title="Location" />
    ),
    cell: ({ row }) => {
      const location: string = row.getValue("location");
      const barangay = location.split(",").at(0);
      const city = location.split(",").at(1);
      const province = location.split(",").at(2);

      return <div className="w-32"> {`${barangay}, ${city}`} </div>;
    },
  },
  {
    accessorKey: "area",
    header: ({ column }) => <TableColumnHeader column={column} title="Area" />,
    cell: ({ row }) => {
      const area = parseFloat(row.getValue("area"));

      return <div> {area.toFixed(2)} ha </div>;
    },
  },
  {
    accessorKey: "tags",
    header: ({ column }) => (
      <TableColumnHeader column={column} title="Data Type" />
    ),
    cell: ({ row }) => {
      const tags: string[] = row.getValue("tags");

      return (
        <div className="flex gap-1">
          {tags.map((tag: string, i: number) => (
            <Badge
              key={i}
              variant="outline"
              className="px-1.5 text-muted-foreground"
            >
              {tag.toUpperCase()}
            </Badge>
          ))}
        </div>
      );
    },
    filterFn: includesStringFilter,
    enableSorting: false,
  },
  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex size-8 text-muted-foreground cursor-pointer data-[state=open]:bg-muted"
            size="icon"
          >
            <MoreVerticalIcon />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>Make a copy</DropdownMenuItem>
          <DropdownMenuItem>Favorite</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export function DataTable({ data }: { data: z.infer<typeof schema>[] }) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    enableRowSelection: true,
    enableMultiRowSelection: false,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      pagination,
      rowSelection,
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by ID"
            value={(table.getColumn("id")?.getFilterValue() as string) ?? ""}
            onChange={(e) =>
              table.getColumn("id")?.setFilterValue(e.target.value)
            }
            className="h-8 w-12 lg:w-56"
          />
          <TableFacetedFilter
            column={table.getColumn("tags")}
            title="Data Type"
            options={survey_data_types}
          />
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => {
                table.resetColumnFilters();
                table.resetRowSelection();
              }}
              className="h-8 hidden md:px-2 lg:px-3 lg:flex"
            >
              Reset <XIcon />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ColumnsIcon />
                <span className="hidden lg:inline">Customize Columns</span>
                <span className="lg:hidden">Columns</span>
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id.split("_").join(" ")}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6 max-w-full">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
              <TableRow></TableRow>
            </TableBody>
          </Table>
        </div>
        {/* <div className="flex items-center justify-between px-4">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger id="rows-per-page" className="w-20">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, , 40, 50, 100].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>

            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRightIcon />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRightIcon />
              </Button>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
}

function TableCellViewer({ survey }: { survey: z.infer<typeof schema> }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {survey.id}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader className="gap-1">
          <SheetTitle>{survey.id}</SheetTitle>
          <SheetDescription>Showing survey area extent</SheetDescription>
          {/* <SheetDescription>{`${survey.code}-${survey.area_code}`}</SheetDescription> */}
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 text-sm">
          <div className="w-full h-56">
            <Map
              initialViewState={{
                longitude: (survey.min_x + survey.max_x) / 2,
                latitude: (survey.min_y + survey.max_y) / 2,
                bounds: findExtremeCoordinates(survey.geojson_boundaries),
                fitBoundsOptions: { padding: 25 },
              }}
              mapStyle={{
                version: 8,
                sources: {
                  osm: {
                    type: "raster",
                    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                    tileSize: 256,
                    attribution: "&copy; OpenStreetMap Contributors",
                  },
                },
                layers: [{ id: "osm", type: "raster", source: "osm" }],
              }}
              doubleClickZoom={false}
              attributionControl={false}
            >
              <Source
                id={survey.id}
                type="geojson"
                data={{
                  type: "FeatureCollection",
                  features: [
                    {
                      type: "Feature",
                      properties: {},
                      geometry: {
                        type: "Polygon",
                        coordinates: [
                          survey.geojson_boundaries.map((pair) => [
                            parseFloat(pair[0]),
                            parseFloat(pair[1]),
                          ]),
                        ],
                      },
                    },
                  ],
                }}
              >
                <Layer
                  id={`${survey.id}-fill`}
                  type="fill"
                  source={survey.id}
                  paint={{ "fill-color": "#088", "fill-opacity": 0.5 }}
                />
              </Source>
              <Marker
                longitude={(survey.min_x + survey.max_x) / 2}
                latitude={(survey.min_y + survey.max_y) / 2}
                anchor="center"
              />
            </Map>
          </div>
          <Separator />
          <div className="grid gap-2">
            <div className="flex gap-2 font-medium leading-none">
              Land Area: {survey.area.toFixed(2)} ha
            </div>
            <div className="text-muted-foreground">
              Shown here is the boundary of the drone survey area. This outlines
              the geographical scope over which aerial data was collected.
            </div>
          </div>
          <Separator />
          <Table>
            <TableBody>
              <TableRow>
                <TableCell> Survey ID: </TableCell>
                <TableCell>{survey.id}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell> Client: </TableCell>
                <TableCell>{survey.code}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell> Area Code: </TableCell>
                <TableCell>{survey.area_code}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Orthomap:</TableCell>
                <TableCell>
                  <DataAvailabilityIndicator
                    availability={survey.tags.includes("rgb")}
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Plant Health Data:</TableCell>
                <TableCell>
                  <DataAvailabilityIndicator
                    availability={survey.tags.includes("multispectral")}
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Elevation Models:</TableCell>
                <TableCell>
                  <DataAvailabilityIndicator
                    availability={survey.tags.includes("lidar")}
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>3D Model:</TableCell>
                <TableCell>
                  {/* <CircleCheckIcon className="size-4 text-success" /> */}
                  <DataAvailabilityIndicator
                    availability={
                      survey.tags.includes("rgb") ||
                      survey.tags.includes("lidar")
                    }
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Crop Detection:</TableCell>
                <TableCell>
                  <div className="flex gap-1 items-center">
                    <BananaIcon className="size-4 text-warning" />
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <SheetFooter className="mt-auto flex gap-2 sm:flex-col sm:space-x-0">
          <Link href={`/dashboard/surveys/${survey.id}`}>
            <Button className="w-full"> View {survey.id} </Button>
          </Link>
          <Button variant="outline" className="w-full">
            {" "}
            View {survey.code}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function DataAvailabilityIndicator({
  availability,
}: {
  availability: boolean;
}) {
  if (availability === true)
    return <CircleCheckIcon className="size-4 text-success" />;

  return <CircleXIcon className="size-4 text-destructive" />;
}
