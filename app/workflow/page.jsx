"use client";
import { useState, useEffect } from "react";
import { FileText, ArrowRight, CheckCircle, Circle, AlertCircle, Clock, Send, Plus } from "lucide-react";
import Badge from "@/components/Badge";
import Btn from "@/components/Btn";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import { useUser } from "@/lib/UserContext";

const STATUS_STYLES = {
    doing: { label: "Đang làm", color: "#3B82F6", bg: "#EFF6FF" },
    todo: { label: "Chờ", color: "#64748B", bg: "#F1F5F9" },
    done: { label: "Xong", color: "#10B981", bg: "#ECFDF5" },
    blocked: { label: "Blocked", color: "#EF4444", bg: "#FEF2F2" },
};

const PRIORITY_STYLES = {
    P0: { label: "P0", color: "#EF4444" },
    P1: { label: "P1", color: "#F59E0B" },
    P2: { label: "P2", color: "#3B82F6" },
};

export default function WorkflowPage() {
    const { currentUser } = useUser();
    const [workflow, setWorkflow] = useState(null);
    const [members, setMembers] = useState([]);
    const [showStandup, setShowStandup] = useState(false);
    const [standupForm, setStandupForm] = useState({ yesterday: "", today: "", blockers: "" });

    const reload = () => {
        fetch("/api/members").then(r => r.json()).then(setMembers);
        fetch("/api/workflow").then(r => r.json()).then(setWorkflow).catch(() => setWorkflow(null));
    };

    useEffect(() => { reload(); }, []);

    const updateStepStatus = async (stepId, newStatus) => {
        await fetch("/api/workflow", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "updateStep", stepId, status: newStatus }),
        });
        reload();
    };

    const addStandup = async () => {
        if (!standupForm.today) return;
        await fetch("/api/workflow", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "addStandup",
                author: currentUser?.id || "toan",
                ...standupForm,
            }),
        });
        setShowStandup(false);
        setStandupForm({ yesterday: "", today: "", blockers: "" });
        reload();
    };

    if (!workflow) return <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>Đang tải...</div>;

    return (
        <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                    <h2 style={{ color: "#0F172A", margin: 0, fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
                        <FileText size={22} color="#F97316" /> Workflow & Handoff
                    </h2>
                    <p style={{ color: "#64748B", margin: "4px 0 0", fontSize: 13 }}>Quy trình làm việc, task ưu tiên, standup hàng ngày</p>
                </div>
                <Btn onClick={() => setShowStandup(true)} color="#F97316"><Plus size={14} /> Ghi Standup</Btn>
            </div>

            {/* Task Pipeline - K01 to K06 */}
            <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <h3 style={{ color: "#0F172A", margin: "0 0 16px", fontSize: 15 }}>🎯 Tasks ưu tiên (IBSHI v5.x)</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {workflow.steps.map((step, i) => {
                        const ss = STATUS_STYLES[step.status] || STATUS_STYLES.todo;
                        const ps = PRIORITY_STYLES[step.priority] || PRIORITY_STYLES.P2;
                        const member = members.find(m => m.id === step.owner);
                        const isBlocked = step.status === "blocked";
                        const canStart = step.dependsOn ? workflow.steps.find(s => s.id === step.dependsOn)?.status === "done" : true;

                        return (
                            <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                {/* Connection line */}
                                {i > 0 && step.dependsOn && (
                                    <div style={{ position: "absolute", marginLeft: 19, marginTop: -20, width: 2, height: 12, background: "#E2E8F0" }} />
                                )}
                                <div style={{
                                    flex: 1, display: "flex", alignItems: "center", gap: 12,
                                    background: ss.bg, borderRadius: 10, padding: "12px 16px",
                                    border: `1px solid ${ss.color}25`, opacity: isBlocked ? 0.7 : 1,
                                }}>
                                    {/* Status icon */}
                                    <div style={{ flexShrink: 0 }}>
                                        {step.status === "done" ? <CheckCircle size={20} color="#10B981" /> :
                                            step.status === "doing" ? <Clock size={20} color="#3B82F6" /> :
                                                step.status === "blocked" ? <AlertCircle size={20} color="#EF4444" /> :
                                                    <Circle size={20} color="#CBD5E1" />}
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                                            <span style={{ color: "#0F172A", fontWeight: 600, fontSize: 14 }}>{step.id}</span>
                                            <Badge color={ps.color}>{ps.label}</Badge>
                                            <Badge color={ss.color} bg={ss.bg}>{ss.label}</Badge>
                                        </div>
                                        <div style={{ color: "#475569", fontSize: 13 }}>{step.title}</div>
                                        {step.note && <div style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>{step.note}</div>}
                                    </div>

                                    {/* Owner */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                                        <span style={{ fontSize: 16 }}>{member?.avatar || "👤"}</span>
                                        <span style={{ color: "#64748B", fontSize: 12 }}>{member?.name}</span>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                        {step.status === "todo" && canStart && (
                                            <Btn size="sm" color="#3B82F6" onClick={() => updateStepStatus(step.id, "doing")}>▶ Bắt đầu</Btn>
                                        )}
                                        {step.status === "doing" && (
                                            <Btn size="sm" color="#10B981" onClick={() => updateStepStatus(step.id, "done")}>✅ Xong</Btn>
                                        )}
                                        {step.status === "blocked" && (
                                            <Btn size="sm" color="#F59E0B" variant="outline" onClick={() => updateStepStatus(step.id, "todo")}>🔓 Unblock</Btn>
                                        )}
                                    </div>
                                </div>

                                {/* Arrow to next */}
                                {i < workflow.steps.length - 1 && step.dependsOn !== null && (
                                    <ArrowRight size={16} color="#CBD5E1" style={{ flexShrink: 0 }} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                {/* Development Flow */}
                <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <h3 style={{ color: "#0F172A", margin: "0 0 16px", fontSize: 15 }}>🔄 Quy trình phát triển</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                        {workflow.devFlow.map((f, i) => (
                            <div key={f.step}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: "50%",
                                        background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0,
                                    }}>{f.step}</div>
                                    <div>
                                        <span style={{ fontSize: 16, marginRight: 6 }}>{f.icon}</span>
                                        <span style={{ color: "#0F172A", fontSize: 13 }}>{f.label}</span>
                                    </div>
                                </div>
                                {i < workflow.devFlow.length - 1 && (
                                    <div style={{ marginLeft: 15, height: 16, width: 2, background: "#E2E8F0" }} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Key Files & Contacts */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Contacts */}
                    <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                        <h3 style={{ color: "#0F172A", margin: "0 0 12px", fontSize: 15 }}>📞 Liên hệ khi cần</h3>
                        {workflow.contacts.map((c, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < workflow.contacts.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                                <span style={{ color: "#64748B", fontSize: 13 }}>{c.topic}</span>
                                <span style={{ color: "#0F172A", fontSize: 13, fontWeight: 500 }}>{c.action}</span>
                            </div>
                        ))}
                    </div>

                    {/* Key Files */}
                    <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                        <h3 style={{ color: "#0F172A", margin: "0 0 12px", fontSize: 15 }}>📁 Files quan trọng</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {workflow.keyFiles.map((f, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#F8FAFC", borderRadius: 6 }}>
                                    <span style={{ color: "#3B82F6", fontWeight: 600, fontSize: 12, fontFamily: "monospace", minWidth: 140 }}>{f.name}</span>
                                    <span style={{ color: "#64748B", fontSize: 12, flex: 1 }}>{f.purpose}</span>
                                    {f.action === "ĐỌC ĐẦU TIÊN" && <Badge color="#EF4444">★ {f.action}</Badge>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Standups */}
            <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <h3 style={{ color: "#0F172A", margin: "0 0 16px", fontSize: 15 }}>📋 Daily Standup Log</h3>
                {workflow.dailyStandups.length === 0 && (
                    <div style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", padding: 20 }}>Chưa có standup — bấm "Ghi Standup" để bắt đầu!</div>
                )}
                {[...workflow.dailyStandups].reverse().map(s => {
                    const author = members.find(m => m.id === s.author);
                    return (
                        <div key={s.id} style={{ padding: "12px 16px", background: "#F8FAFC", borderRadius: 8, marginBottom: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 16 }}>{author?.avatar || "👤"}</span>
                                    <span style={{ color: "#0F172A", fontWeight: 600, fontSize: 13 }}>{author?.name || s.author}</span>
                                </div>
                                <span style={{ color: "#94A3B8", fontSize: 12 }}>{s.date}</span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                                <div>
                                    <div style={{ color: "#94A3B8", fontSize: 11, marginBottom: 2 }}>Hôm qua</div>
                                    <div style={{ color: "#475569", fontSize: 13 }}>{s.yesterday}</div>
                                </div>
                                <div>
                                    <div style={{ color: "#94A3B8", fontSize: 11, marginBottom: 2 }}>Hôm nay</div>
                                    <div style={{ color: "#475569", fontSize: 13 }}>{s.today}</div>
                                </div>
                                <div>
                                    <div style={{ color: "#94A3B8", fontSize: 11, marginBottom: 2 }}>Blockers</div>
                                    <div style={{ color: s.blockers === "Không có" ? "#10B981" : "#EF4444", fontSize: 13 }}>{s.blockers}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Standup Modal */}
            {showStandup && (
                <Modal title="📋 Ghi Standup hôm nay" onClose={() => setShowStandup(false)}>
                    <Input label="Hôm qua đã làm gì?" value={standupForm.yesterday} onChange={v => setStandupForm(f => ({ ...f, yesterday: v }))} placeholder="Mô tả công việc hôm qua..." multiline />
                    <Input label="Hôm nay sẽ làm gì?" value={standupForm.today} onChange={v => setStandupForm(f => ({ ...f, today: v }))} placeholder="Plan hôm nay..." multiline />
                    <Input label="Blockers?" value={standupForm.blockers} onChange={v => setStandupForm(f => ({ ...f, blockers: v }))} placeholder="Vướng mắc gì? (Không có thì ghi 'Không có')" />
                    <Btn onClick={addStandup} color="#F97316" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                        <Send size={14} /> Ghi Standup
                    </Btn>
                </Modal>
            )}
        </div>
    );
}
