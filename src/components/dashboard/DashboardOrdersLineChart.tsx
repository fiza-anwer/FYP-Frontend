import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

type Point = { date: string; count: number };

export default function DashboardOrdersLineChart({ data }: { data: Point[] }) {
  const categories = data.map((d) => {
    const isMonth = /^\d{4}-\d{2}$/.test(d.date);
    const dt = new Date(`${d.date}${isMonth ? "-01" : ""}T12:00:00`);
    if (isMonth) {
      return dt.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    }
    return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  });
  const counts = data.map((d) => d.count);

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "area",
      height: 300,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ["#f43f5e"],
    stroke: { curve: "smooth", width: 2.5 },
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "vertical",
        shadeIntensity: 0.35,
        gradientToColors: ["#fb7185"],
        opacityFrom: 0.5,
        opacityTo: 0.06,
        stops: [0, 85, 100],
      },
    },
    dataLabels: { enabled: false },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { rotate: -45, style: { fontSize: "11px" } },
    },
    yaxis: {
      labels: {
        style: { colors: "#6B7280", fontSize: "12px" },
      },
      title: { text: "Orders" },
    },
    tooltip: { x: { show: true } },
  };

  const series = [{ name: "Orders", data: counts }];

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div className="min-w-[600px]">
        <Chart options={options} series={series} type="area" height={300} />
      </div>
    </div>
  );
}
