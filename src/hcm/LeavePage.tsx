// 休假资源页(mock)。EE: 余额 + 申请(本地表单卡) + 我的申请; ER: 待审批休假。
import { useState } from "react";
import { useStore } from "../state/store";
import { A2UIRenderer } from "../a2ui/components";
import { ResourcePage, StatTiles, Section } from "./ResourcePage";
import { SHORTCUTS } from "./hcmModules";
import { leaveBalance, leaveTypes, myLeaveRequests, pendingLeave } from "./hcmMock";

const today = () => new Date().toISOString().slice(0, 10);
const STA: Record<string, { zh: string; en: string }> = {
  pending: { zh: "待审批", en: "Pending" }, approved: { zh: "已批准", en: "Approved" }, rejected: { zh: "已驳回", en: "Rejected" },
};

export function LeavePage() {
  const { role, lang } = useStore();
  const zh = lang === "zh";
  const [showForm, setShowForm] = useState(false);
  return (
    <ResourcePage icon="🌴" title={zh ? "休假" : "Leave"} shortcuts={SHORTCUTS.leave[role]}>
      {role === "ee" ? (
        <>
          <StatTiles tiles={[
            { label: zh ? "年假(天)" : "Annual", value: String(leaveBalance.annual) },
            { label: zh ? "病假(天)" : "Sick", value: String(leaveBalance.sick) },
            { label: zh ? "调休(天)" : "TOIL", value: String(leaveBalance.toil) },
          ]} />
          <Section title={zh ? "申请休假" : "Request leave"}>
            {showForm ? (
              <A2UIRenderer outputType="leave_request" data={{ types: leaveTypes, type: leaveTypes[0], from: today(), to: today(), reason: "" }} />
            ) : (
              <button className="res-action" onClick={() => setShowForm(true)}>＋ {zh ? "申请休假" : "New leave request"}</button>
            )}
          </Section>
          <Section title={zh ? "我的申请" : "My requests"}>
            <div className="res-list">
              {myLeaveRequests.map((r) => (
                <div className="res-row" key={r.id}>
                  <div className="res-row-main"><b>{r.type}</b><span className="res-sub">{r.from} ~ {r.to} · {r.days}d</span></div>
                  <span className={`res-badge ${r.status}`}>{STA[r.status]?.[lang] ?? r.status}</span>
                </div>
              ))}
            </div>
          </Section>
        </>
      ) : (
        <Section title={zh ? "待审批休假" : "Pending leave"}>
          <A2UIRenderer outputType="leave_pending_list" data={{ rows: pendingLeave }} />
        </Section>
      )}
    </ResourcePage>
  );
}
