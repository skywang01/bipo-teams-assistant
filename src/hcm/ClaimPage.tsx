// 报销资源页(mock)。EE: 额度 + 新建(本地表单卡) + 我的报销单; ER: 待审批 + 部门统计。
import { useState } from "react";
import { useStore } from "../state/store";
import { A2UIRenderer } from "../a2ui/components";
import { ResourcePage, StatTiles, Section } from "./ResourcePage";
import { SHORTCUTS } from "./hcmModules";
import { expenseCategories, myClaims, myClaimSummary, pendingClaims, claimDeptStats } from "./hcmMock";

const today = () => new Date().toISOString().slice(0, 10);
const STA: Record<string, { zh: string; en: string }> = {
  pending: { zh: "待审批", en: "Pending" }, approved: { zh: "已批准", en: "Approved" }, rejected: { zh: "已驳回", en: "Rejected" },
};

export function ClaimPage() {
  const { role, lang, toast } = useStore();
  const zh = lang === "zh";
  const [showForm, setShowForm] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});
  return (
    <ResourcePage icon="🧾" title={zh ? "报销" : "Claim"} shortcuts={SHORTCUTS.claim[role]}>
      {role === "ee" ? (
        <>
          <StatTiles tiles={[
            { label: zh ? "本月已用" : "Used", value: `${myClaimSummary.currency} ${myClaimSummary.monthUsed}` },
            { label: zh ? "额度" : "Quota", value: `${myClaimSummary.currency} ${myClaimSummary.quota}` },
            { label: zh ? "待处理" : "Pending", value: String(myClaimSummary.pending) },
          ]} />
          <Section title={zh ? "新建报销" : "New claim"}>
            {showForm ? (
              <A2UIRenderer outputType="reimbursement" data={{ categories: expenseCategories, category: expenseCategories[0], amount: "", currency: "CNY", date: today(), note: "", receipt: false }} />
            ) : (
              <button className="res-action" onClick={() => setShowForm(true)}>＋ {zh ? "新建报销单" : "New expense claim"}</button>
            )}
          </Section>
          <Section title={zh ? "我的报销单" : "My claims"}>
            <div className="res-list">
              {myClaims.map((c) => (
                <div className="res-row" key={c.id}>
                  <div className="res-row-main"><b>{c.category}</b><span className="res-sub">{myClaimSummary.currency} {c.amount} · {c.date}</span></div>
                  <span className={`res-badge ${c.status}`}>{STA[c.status]?.[lang] ?? c.status}</span>
                </div>
              ))}
            </div>
          </Section>
        </>
      ) : (
        <>
          <StatTiles tiles={[
            { label: zh ? "本月报销总额" : "Month total", value: `${claimDeptStats.currency} ${claimDeptStats.monthTotal}` },
            { label: zh ? "待审批" : "Pending", value: String(claimDeptStats.pendingCount) },
            { label: zh ? "最高部门" : "Top dept", value: claimDeptStats.topDept },
          ]} />
          <Section title={zh ? "待审批报销" : "Pending claims"}>
            <div className="res-list">
              {pendingClaims.map((c) => (
                <div className="res-row" key={c.id}>
                  <div className="res-row-main">
                    <b>{c.name}</b><span className="res-sub">{c.dept} · {c.category} · {claimDeptStats.currency} {c.amount} · {c.date}</span>
                    {c.flag && <span className="res-flag">⚠️ {c.flag}</span>}
                  </div>
                  {done[c.id] ? (
                    <span className="res-badge approved">{zh ? "已批准" : "Approved"}</span>
                  ) : (
                    <button className="res-mini" onClick={() => { setDone((m) => ({ ...m, [c.id]: true })); toast(zh ? "已批准" : "Approved"); }}>{zh ? "批准" : "Approve"}</button>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
    </ResourcePage>
  );
}
