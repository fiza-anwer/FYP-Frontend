import type { DashboardAnalytics } from "../api/client";

type CellValue = string | number | null;
type ChartKind = "column" | "bar" | "line" | "doughnut";
type Sheet = {
  name: string;
  rows: CellValue[][];
  columnWidths: number[];
  titleRows?: number[];
  headerRows?: number[];
  sectionRows?: number[];
  metricRows?: number[];
  metadataRows?: number[];
  filter?: boolean;
  chart?: {
    title: string;
    labels: string[];
    values: number[];
    valueColumn: string;
    kind: ChartKind;
  };
};

function xml(value: string) {
  const validXmlCharacters = Array.from(value).filter((character) => {
    const codePoint = character.codePointAt(0)!;
    return codePoint === 0x9 || codePoint === 0xA || codePoint === 0xD ||
      (codePoint >= 0x20 && codePoint <= 0xD7FF) ||
      (codePoint >= 0xE000 && codePoint <= 0xFFFD) ||
      (codePoint >= 0x10000 && codePoint <= 0x10FFFF);
  }).join("");
  return validXmlCharacters.replace(/[<>&'"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[char] as string);
}

function columnName(index: number) {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

function worksheetXml(sheet: Sheet) {
  const { rows } = sheet;
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, colIndex) => {
      if (value == null || value === "") return "";
      const ref = `${columnName(colIndex)}${rowIndex + 1}`;
      const style = sheet.titleRows?.includes(rowIndex)
        ? 1
        : sheet.sectionRows?.includes(rowIndex)
          ? 2
        : sheet.headerRows?.includes(rowIndex)
          ? 3
          : sheet.metricRows?.includes(rowIndex)
            ? (colIndex % 2 === 0 ? 7 : typeof value === "number" ? (Number.isInteger(value) ? 8 : 9) : 10)
            : sheet.metadataRows?.includes(rowIndex)
              ? (colIndex % 2 === 0 ? 7 : 0)
              : rowIndex === 0
                ? 3
                : rowIndex % 2 === 0 ? 4 : 0;
      if (typeof value === "number" && Number.isFinite(value)) {
        const numericStyle = style === 0 ? (Number.isInteger(value) ? 11 : 12)
          : style === 4 ? (Number.isInteger(value) ? 5 : 6) : style;
        return `<c r="${ref}" s="${numericStyle}"><v>${value}</v></c>`;
      }
      return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(String(value))}</t></is></c>`;
    }).join("");
    const height = rowIndex === 0 ? ' ht="30" customHeight="1"' : sheet.sectionRows?.includes(rowIndex) ? ' ht="24" customHeight="1"' : "";
    return `<row r="${rowIndex + 1}"${height}>${cells}</row>`;
  }).join("");
  const columnWidths = sheet.columnWidths.map((width, index) =>
    `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
  ).join("");
  const mergeRows = [...(sheet.sectionRows ?? []), ...(sheet.titleRows ?? [])].sort((a, b) => a - b);
  const merges = mergeRows.map((row) => `<mergeCell ref="A${row + 1}:${columnName(sheet.columnWidths.length - 1)}${row + 1}"/>`).join("");
  const autoFilter = sheet.filter && rows.length > 1
    ? `<autoFilter ref="A1:${columnName(Math.max(0, ...rows.map((row) => row.length - 1)))}${rows.length}"/>`
    : "";
  const drawing = sheet.chart ? '<drawing r:id="rId1"/>' : "";
  const relationships = sheet.chart
    ? ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
    : "";
  const mergesXml = merges ? `<mergeCells count="${mergeRows.length}">${merges}</mergeCells>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"${relationships}>
<sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="20"/><cols>${columnWidths}</cols><sheetData>${sheetRows}</sheetData>
${autoFilter}${mergesXml}${drawing}
</worksheet>`;
}

function chartXml(title: string, labels: string[], values: number[], sheetName: string, valueColumn: string, kind: ChartKind) {
  const endRow = labels.length + 1;
  const points = (items: (string | number)[]) =>
    items.map((value, index) => `<c:pt idx="${index}"><c:v>${xml(String(value))}</c:v></c:pt>`).join("");
  const marker = kind === "line"
    ? '<c:marker><c:symbol val="circle"/><c:size val="5"/></c:marker>'
    : "";
  const series = `<c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:strRef><c:f>'${sheetName}'!$${valueColumn}$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${xml(title)}</c:v></c:pt></c:strCache></c:strRef></c:tx>
${marker}
<c:cat><c:strRef><c:f>'${sheetName}'!$A$2:$A$${endRow}</c:f><c:strCache><c:ptCount val="${labels.length}"/>${points(labels)}</c:strCache></c:strRef></c:cat>
<c:val><c:numRef><c:f>'${sheetName}'!$${valueColumn}$2:$${valueColumn}$${endRow}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${values.length}"/>${points(values)}</c:numCache></c:numRef></c:val></c:ser>`;
  const plot = kind === "doughnut"
    ? `<c:doughnutChart><c:varyColors val="1"/>${series}<c:dLbls><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="1"/><c:showLeaderLines val="1"/></c:dLbls><c:firstSliceAng val="270"/><c:holeSize val="58"/></c:doughnutChart>`
    : kind === "line"
      ? `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${series}<c:smooth val="0"/><c:axId val="123456"/><c:axId val="123457"/></c:lineChart>`
      : `<c:barChart><c:barDir val="${kind === "bar" ? "bar" : "col"}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series}<c:dLbls><c:numFmt formatCode="#,##0" sourceLinked="0"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/></c:dLbls><c:gapWidth val="70"/><c:axId val="123456"/><c:axId val="123457"/></c:barChart>`;
  const categoryAxisPosition = kind === "bar" ? "l" : "b";
  const valueAxisPosition = kind === "bar" ? "b" : "l";
  const axes = kind === "doughnut" ? "" : `<c:catAx><c:axId val="123456"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${categoryAxisPosition}"/><c:tickLblPos val="nextTo"/><c:crossAx val="123457"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx>
<c:valAx><c:axId val="123457"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${valueAxisPosition}"/><c:majorGridlines><c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="#,##0.##" sourceLinked="0"/><c:crossAx val="123456"/><c:crosses val="autoZero"/></c:valAx>`;
  const legend = kind === "doughnut"
    ? '<c:legend><c:legendPos val="r"/><c:layout/><c:overlay val="0"/></c:legend>'
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
<c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="1400" b="1"/><a:t>${xml(title)}</a:t></a:r><a:endParaRPr lang="en-US"/></a:p></c:rich></c:tx></c:title>
<c:plotArea><c:layout/>${plot}${axes}</c:plotArea>${legend}<c:plotVisOnly val="1"/></c:chart><c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr><c:printSettings><c:headerFooter/><c:pageMargins b="0.5" l="0.25" r="0.25" t="0.5" header="0.2" footer="0.2"/></c:printSettings></c:chartSpace>`;
}

function chartDrawingXml(startRow: number) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${startRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>11</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${startRow + 19}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Chart 1"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`;
}

function workbookParts(sheets: Sheet[]) {
  const files: Record<string, string> = {};
  const sheetEntries = sheets.map((sheet, index) =>
    `<sheet name="${xml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
  ).join("");
  files["[Content_Types].xml"] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>
${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheets.map((sheet, index) => sheet.chart ? `<Override PartName="/xl/charts/chart${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/><Override PartName="/xl/drawings/drawing${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>` : "").join("")}
</Types>`;
  files["_rels/.rels"] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  files["xl/workbook.xml"] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetEntries}</sheets></workbook>`;
  files["xl/_rels/workbook.xml.rels"] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  files["xl/styles.xml"] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0"/><numFmt numFmtId="165" formatCode="#,##0.00"/></numFmts>
<fonts count="4">
<font><sz val="11"/><color rgb="FF263247"/><name val="Aptos"/></font>
<font><b/><sz val="17"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font>
<font><b/><sz val="12"/><color rgb="FF312E81"/><name val="Aptos"/></font>
</fonts>
<fills count="6">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF4F46E5"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF334155"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEEF2FF"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="hair"><color rgb="FFE2E8F0"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="13">
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" horizontal="left"/></xf>
<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" horizontal="right"/></xf>
<xf numFmtId="165" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" horizontal="right"/></xf>
<xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="3" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" horizontal="right"/></xf>
<xf numFmtId="165" fontId="3" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" horizontal="right"/></xf>
<xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" horizontal="left" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" horizontal="right"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" horizontal="right"/></xf>
</cellXfs>
</styleSheet>`;
  sheets.forEach((sheet, index) => {
    const sheetNumber = index + 1;
    files[`xl/worksheets/sheet${sheetNumber}.xml`] = worksheetXml(sheet);
    if (sheet.chart) {
      files[`xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${sheetNumber}.xml"/></Relationships>`;
      files[`xl/drawings/drawing${sheetNumber}.xml`] = chartDrawingXml(sheet.rows.length + 2);
      files[`xl/drawings/_rels/drawing${sheetNumber}.xml.rels`] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${sheetNumber}.xml"/></Relationships>`;
      files[`xl/charts/chart${sheetNumber}.xml`] = chartXml(
        sheet.chart.title,
        sheet.chart.labels,
        sheet.chart.values,
        sheet.name,
        sheet.chart.valueColumn,
        sheet.chart.kind,
      );
    }
  });
  return files;
}

export async function createDashboardReportWorkbook(
  analytics: DashboardAnalytics,
  startDate: string,
  endDate: string,
) {
  const JSZip = (await import("jszip")).default;
  const orders = analytics.orders_in_range ?? [];
  const revenueRows = analytics.revenue_by_month ?? [];
  const topProducts = analytics.top_products ?? [];
  const money = (value: number) => Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
  const ordersByDay = analytics.orders_by_day ?? [];
  const displayDate = (value: string) => {
    const parsed = new Date(`${value}T12:00:00`);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };
  const summary: CellValue[][] = [
    ["DASHBOARD PERFORMANCE REPORT", "", "", ""],
    ["Reporting period", `${displayDate(startDate)} – ${displayDate(endDate)}`, "Generated", new Date().toLocaleString()],
    [],
    ["PERFORMANCE OVERVIEW", "", "", ""],
    ["Total orders", analytics.range_summary?.total_orders ?? 0, "Total revenue", money(analytics.range_summary?.total_revenue ?? 0)],
    ["Average order value", money(analytics.range_summary?.average_order_value ?? 0), "Orders included", orders.length],
    ["Slow-moving products", analytics.stale_products?.length ?? 0, "Revenue note", "Totals are not currency-converted; see each order's currency."],
    [],
    ["TOP PRODUCTS", "", "", ""],
    ["Product", "Units ordered", "SKU", "Product type"],
    ...topProducts.map((item) => [item.title, item.order_count, item.sku, item.product_type ?? ""]),
    [],
    ["SLOW-MOVING PRODUCT ACTIONS", "", "", ""],
    ["Product", "Last ordered", "Days without order", "Suggested action"],
    ...(analytics.stale_products ?? []).map((item) => [
      item.title,
      item.last_order_at ? displayDate(item.last_order_at.slice(0, 10)) : "No recorded orders",
      item.days_without_order ?? "",
      item.strategy?.detail ?? "",
    ]),
  ];
  const orderSheet: CellValue[][] = [
    ["Order number", "Date", "Customer email", "Company", "Source", "Status", "Payment status", "Fulfillment", "Currency", "Total"],
    ...orders.map((order) => [
      order.order_number ?? order.id,
      order.created_at ?? "",
      order.email ?? "",
      order.company_name ?? "",
      order.source ?? "",
      order.status ?? "",
      order.financial_status ?? "",
      order.fulfillment_status ?? "",
      order.currency ?? "",
      money(Number(order.total ?? 0)),
    ]),
  ];
  const revenueSheet: CellValue[][] = [
    ["Period", "Orders", "Revenue (source amount; see Orders currency)"],
    ...revenueRows.map((item) => [item.month, item.orders, money(item.revenue)]),
  ];
  const dailySheet: CellValue[][] = [
    ["Date", "Orders"],
    ...ordersByDay.map((item) => [displayDate(item.date), item.count]),
  ];
  const sheets: Sheet[] = [
    {
      name: "Summary",
      rows: summary,
      columnWidths: [34, 24, 28, 64],
      titleRows: [0],
      sectionRows: [3, 8, 11 + topProducts.length],
      headerRows: [9, 12 + topProducts.length],
      metricRows: [4, 5, 6],
      metadataRows: [1],
    },
    {
      name: "Orders",
      rows: orderSheet,
      columnWidths: [16, 24, 34, 26, 16, 18, 19, 20, 12, 16],
      filter: true,
    },
    {
      name: "Revenue",
      rows: revenueSheet,
      columnWidths: [18, 14, 48],
      filter: true,
      ...(revenueRows.length ? { chart: { title: "Revenue by period", labels: revenueRows.map((item) => item.month), values: revenueRows.map((item) => money(item.revenue)), valueColumn: "C", kind: "column" as const } } : {}),
    },
    {
      name: "Daily Activity",
      rows: dailySheet,
      columnWidths: [24, 16],
      filter: true,
      ...(ordersByDay.length ? { chart: { title: "Orders by day", labels: ordersByDay.map((item) => displayDate(item.date)), values: ordersByDay.map((item) => item.count), valueColumn: "B", kind: "line" as const } } : {}),
    },
  ];
  if (topProducts.length) {
    sheets.push({
      name: "Product Insights",
      rows: [
        ["Product", "Units ordered", "SKU", "Product type"],
        ...topProducts.map((item) => [item.title, item.order_count, item.sku, item.product_type ?? ""]),
      ],
      columnWidths: [48, 18, 22, 28],
      filter: true,
      chart: {
        title: "Top products",
        labels: topProducts.map((item) => item.title),
        values: topProducts.map((item) => item.order_count),
        valueColumn: "B",
        kind: "bar",
      },
    });
  } else {
    sheets.push({
      name: "Product Insights",
      rows: [["Product", "Units ordered", "SKU", "Product type"]],
      columnWidths: [48, 18, 22, 28],
      filter: true,
    });
  }
  const orderStatus = new Map<string, { count: number; revenue: number }>();
  orders.forEach((order) => {
    const status = order.status || "Unknown";
    const current = orderStatus.get(status) ?? { count: 0, revenue: 0 };
    current.count += 1;
    current.revenue += Number(order.total ?? 0);
    orderStatus.set(status, current);
  });
  const statusRows = [...orderStatus.entries()];
  sheets.push({
    name: "Order Insights",
    rows: [
      ["Status", "Orders", "Revenue (unconverted)"],
      ...statusRows.map(([status, totals]) => [status, totals.count, money(totals.revenue)]),
    ],
    columnWidths: [22, 16, 30],
    filter: true,
    ...(statusRows.length ? {
      chart: {
        title: "Orders by status",
        labels: statusRows.map(([status]) => status),
        values: statusRows.map(([, totals]) => totals.count),
        valueColumn: "B",
        kind: "doughnut",
      },
    } : {}),
  });
  const zip = new JSZip();
  for (const [path, content] of Object.entries(workbookParts(sheets))) zip.file(path, content);
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    compression: "DEFLATE",
  });
  return blob;
}
