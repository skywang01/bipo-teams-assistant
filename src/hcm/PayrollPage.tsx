// 薪资资源页(mock)。EE: 最新工资单 + 历史; ER: 发薪概览大盘。
import { useStore } from "../state/store";
import { A2UIRenderer } from "../a2ui/components";
import { ResourcePage, Section } from "./ResourcePage";
import { SHORTCUTS } from "./hcmModules";
import { payslip, payslipHistory, payrollOverview } from "./hcmMock";

export function PayrollPage() {
  const { role, lang } = useStore();
  const zh = lang === "zh";
  return (
    <ResourcePage icon="💰" title={zh ? "薪资" : "Payroll"} shortcuts={SHORTCUTS.payroll[role]}>
      {role === "ee" ? (
        <>
          <Section title={zh ? "最新工资单" : "Latest payslip"}>
            <A2UIRenderer outputType="payslip" data={payslip as unknown as Record<string, unknown>} />
          </Section>
          <Section title={zh ? "历史工资单" : "Payslip history"}>
            <div className="res-list">
              {payslipHistory.map((p) => (
                <div className="res-row" key={p.period}>
                  <div className="res-row-main"><b>{p.period}</b><span className="res-sub">{zh ? "实发" : "Net"} {payslip.currency} {p.net}</span></div>
                  <span className="res-link">{zh ? "查看" : "View"} ›</span>
                </div>
              ))}
            </div>
          </Section>
        </>
      ) : (
        <Section title={zh ? "发薪概览" : "Payroll overview"}>
          <A2UIRenderer outputType="generated_dashboard" data={payrollOverview} />
        </Section>
      )}
    </ResourcePage>
  );
}
