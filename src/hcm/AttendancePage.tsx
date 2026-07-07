// 考勤资源页(mock)。EE: 今日打卡 + 本月统计 + 记录; ER: 今日 daily + OT 大盘。
import { useStore } from "../state/store";
import { A2UIRenderer } from "../a2ui/components";
import { ResourcePage, StatTiles, Section } from "./ResourcePage";
import { SHORTCUTS } from "./hcmModules";
import { myAttendance, dailyAttendance, generatedDashboard } from "./hcmMock";

const ST: Record<string, { zh: string; en: string }> = {
  normal: { zh: "正常", en: "Normal" }, late: { zh: "迟到", en: "Late" },
  absent: { zh: "缺勤", en: "Absent" }, leave: { zh: "休假", en: "Leave" }, ot: { zh: "OT", en: "OT" },
};

export function AttendancePage() {
  const { role, lang } = useStore();
  const zh = lang === "zh";
  return (
    <ResourcePage icon="🕐" title={zh ? "考勤" : "Attendance"} shortcuts={SHORTCUTS.attendance[role]}>
      {role === "ee" ? (
        <>
          <StatTiles tiles={[
            { label: zh ? "本月出勤" : "Present", value: String(myAttendance.month.present) },
            { label: zh ? "迟到" : "Late", value: String(myAttendance.month.late) },
            { label: zh ? "OT(h)" : "OT(h)", value: String(myAttendance.month.ot) },
            { label: zh ? "缺勤" : "Absent", value: String(myAttendance.month.absent) },
          ]} />
          <Section title={zh ? "今日打卡" : "Today"}>
            <A2UIRenderer outputType="clock_punch" data={{ date: myAttendance.today.date, location: zh ? "当前位置" : "Current location" }} />
          </Section>
          <Section title={zh ? "本月记录" : "This month"}>
            <table className="res-table">
              <thead><tr><th>{zh ? "日期" : "Date"}</th><th>{zh ? "上班" : "In"}</th><th>{zh ? "下班" : "Out"}</th><th>{zh ? "状态" : "Status"}</th></tr></thead>
              <tbody>
                {myAttendance.records.map((r) => (
                  <tr key={r.date}>
                    <td>{r.date}</td><td>{r.in}</td><td>{r.out}</td>
                    <td><span className={`daily-st ${r.status}`}>{ST[r.status]?.[lang] ?? r.status}</span>{r.note && <span className="res-note"> {r.note}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </>
      ) : (
        <>
          <Section title={zh ? "今日出勤" : "Today's attendance"}>
            <A2UIRenderer outputType="daily_attendance" data={dailyAttendance as unknown as Record<string, unknown>} />
          </Section>
          <Section title={zh ? "OT 大盘" : "OT dashboard"}>
            <A2UIRenderer outputType="generated_dashboard" data={generatedDashboard} />
          </Section>
        </>
      )}
    </ResourcePage>
  );
}
