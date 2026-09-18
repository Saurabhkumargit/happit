import type { HeatmapDay } from "../../services/progressApi";
import "./Heatmap.css";

export interface HeatmapProps {
  data: HeatmapDay[];
  startDate: string;
  endDate: string;
}

function Heatmap({ data, startDate, endDate }: HeatmapProps) {
  const dataMap = new Map(data.map((day) => [day.date, day]));

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days: HeatmapDay[] = [];

  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const dayData = dataMap.get(dateStr);

    days.push(
      dayData ?? {
        date: dateStr,
        intensity: 0,
        state: "UNSCHEDULED",
      },
    );

    current.setDate(current.getDate() + 1);
  }

  // Group by weeks (starting Monday)
  const weeks: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];

  const firstDate = new Date(days[0].date);
  const firstDayOfWeek = firstDate.getDay();
  const mondayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Add empty cells for the first week
  for (let i = 0; i < mondayOffset; i++) {
    currentWeek.push({
      date: "",
      intensity: 0,
      state: "UNSCHEDULED",
    });
  }

  days.forEach((day, index) => {
    currentWeek.push(day);

    const date = new Date(day.date);
    const dayOfWeek = date.getDay();

    // Sunday (0) or last day
    if (dayOfWeek === 0 || index === days.length - 1) {
      // Fill remaining days in week if it's the last day
      if (index === days.length - 1 && dayOfWeek !== 0) {
        const remaining = 7 - currentWeek.length;
        for (let i = 0; i < remaining; i++) {
          currentWeek.push({
            date: "",
            intensity: 0,
            state: "UNSCHEDULED",
          });
        }
      }

      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  return (
    <div className="heatmap">
      <div className="heatmap-grid">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="heatmap-week">
            {week.map((day, dayIndex) => {
              if (!day.date) {
                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className="heatmap-day heatmap-day-empty"
                  />
                );
              }

              const intensityClass =
                day.intensity === 0
                  ? "heatmap-day-intensity-0"
                  : day.intensity < 0.33
                    ? "heatmap-day-intensity-1"
                    : day.intensity < 0.67
                      ? "heatmap-day-intensity-2"
                      : day.intensity < 1
                        ? "heatmap-day-intensity-3"
                        : "heatmap-day-intensity-4";

              const stateLabel =
                day.state === "COMPLETED"
                  ? "Completed"
                  : day.state === "INCOMPLETE"
                    ? "Incomplete"
                    : day.state === "UPCOMING"
                      ? "Upcoming"
                      : "No activity";

              return (
                <div
                  key={day.date}
                  className={`heatmap-day ${intensityClass}`}
                  title={`${day.date}: ${stateLabel}${day.intensity > 0 ? ` (${Math.round(day.intensity * 100)}%)` : ""}`}
                  aria-label={`${day.date}: ${stateLabel}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="heatmap-legend">
        <span className="heatmap-legend-label">Less</span>
        <div className="heatmap-legend-scale">
          <div className="heatmap-legend-item heatmap-day-intensity-0" />
          <div className="heatmap-legend-item heatmap-day-intensity-1" />
          <div className="heatmap-legend-item heatmap-day-intensity-2" />
          <div className="heatmap-legend-item heatmap-day-intensity-3" />
          <div className="heatmap-legend-item heatmap-day-intensity-4" />
        </div>
        <span className="heatmap-legend-label">More</span>
      </div>
    </div>
  );
}

export default Heatmap;
