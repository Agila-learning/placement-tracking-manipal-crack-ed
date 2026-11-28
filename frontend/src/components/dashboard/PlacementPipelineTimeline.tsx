import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPlus,
  CalendarCheck,
  Award,
  CreditCard,
  Building,
  TrendingUp,
  Phone,
  Copy,
  Check,
  Briefcase,
} from 'lucide-react';
import { DashboardStats, Application } from '../../types';
import { applicationsApi } from '../../api/endpoints';
import { Modal, Button } from '../ui';

interface PlacementPipelineTimelineProps {
  stats: DashboardStats | null;
  applications?: Application[];
}

interface CandidateContact {
  id: string;
  name: string;
  mobile: string;
}

const SELECTED_MILESTONES = [
  'Selected',
  'Enrollment Fee Pending',
  'Loan Processing',
  'Campus Reporting Pending',
  'Arrived in Campus',
  'Completed',
];

export const PlacementPipelineTimeline: React.FC<PlacementPipelineTimelineProps> = ({
  stats,
  applications: propApplications,
}) => {
  const [activeProcess, setActiveProcess] = useState<'MANIPAL' | 'CRACKED'>('MANIPAL');
  const [internalApps, setInternalApps] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [selectedStage, setSelectedStage] = useState<{
    id: number;
    title: string;
    subtitle: string;
    candidates: CandidateContact[];
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Automatically fetch complete application list on mount if not provided via props
  useEffect(() => {
    let isMounted = true;
    if (!propApplications || propApplications.length === 0) {
      setLoadingApps(true);
      applicationsApi
        .list({ limit: '200' })
        .then((res) => {
          if (isMounted && res.success && res.data) {
            setInternalApps(res.data);
          }
        })
        .catch((err) => {
          console.error('Failed to load applications for pipeline:', err);
        })
        .finally(() => {
          if (isMounted) setLoadingApps(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [propApplications]);

  const apps = (propApplications && propApplications.length > 0) ? propApplications : internalApps;

  // Distinguish Crack-ed applications vs Manipal applications
  const isCrackedApp = (a: Application) => {
    const pType = (a.processType || '').toLowerCase();
    const vName = (a.vendorName || '').toLowerCase();
    const bName = (a.bankName || '').toLowerCase();
    const progName = (a.programName || '').toLowerCase();
    return (
      pType.includes('crack') ||
      vName.includes('crack') ||
      bName.includes('crack') ||
      progName.includes('crack')
    );
  };

  const manipalApps = useMemo(() => apps.filter((a) => !isCrackedApp(a)), [apps]);
  const crackedApps = useMemo(() => apps.filter((a) => isCrackedApp(a)), [apps]);

  // Stage candidates for Manipal Process
  const manipalStagesData = useMemo(() => {
    // 1. Registration
    const registration: CandidateContact[] = manipalApps.map((a) => ({
      id: a._id,
      name: a.candidateName,
      mobile: a.candidateMobile || (a.candidateId as any)?.mobileNumber || '—',
    }));

    // 2. Interview Stage
    const interview: CandidateContact[] = manipalApps
      .filter((a) => {
        const hasInterview = a.interviewRounds && a.interviewRounds.length > 0;
        const inInterviewSt = ['Interview in Progress', 'Awaiting Interview', 'Referred'].includes(a.overallStatus);
        const reachedSelected = SELECTED_MILESTONES.includes(a.overallStatus);
        return hasInterview || inInterviewSt || reachedSelected;
      })
      .map((a) => ({
        id: a._id,
        name: a.candidateName,
        mobile: a.candidateMobile || (a.candidateId as any)?.mobileNumber || '—',
      }));

    // Helper: checks if candidate was selected in L2 or Final Mock round (or overallStatus is selected/advanced)
    const isBankSelected = (a: Application) => {
      const hasRoundSelected = a.interviewRounds?.some(
        (r) => /l2|mock|final/i.test(r.roundName) && (r.currentStatus === 'Selected' || r.result === 'Selected')
      );
      return Boolean(
        hasRoundSelected ||
        a.overallStatus === 'Selected' ||
        a.overallStatus === 'Arrived in Campus' ||
        a.overallStatus === 'Enrollment Fee Pending' ||
        a.overallStatus === 'Loan Processing' ||
        a.overallStatus === 'Campus Reporting Pending'
      );
    };

    // 3. Bank Selection
    const selection: CandidateContact[] = manipalApps
      .filter((a) => isBankSelected(a))
      .map((a) => ({
        id: a._id,
        name: a.candidateName,
        mobile: a.candidateMobile || (a.candidateId as any)?.mobileNumber || '—',
      }));

    // 4. Enrollment Fee
    const enrollment: CandidateContact[] = manipalApps
      .filter((a) => {
        const selected = isBankSelected(a);
        const isPaid =
          (a as any).payment?.paymentStatus === 'Paid' ||
          (a as any).paymentStatus === 'Paid' ||
          ((a as any).payment?.paidAmount || 0) > 0 ||
          a.overallStatus === 'Arrived in Campus';
        return selected && isPaid;
      })
      .map((a) => ({
        id: a._id,
        name: a.candidateName,
        mobile: a.candidateMobile || (a.candidateId as any)?.mobileNumber || '—',
      }));

    // 5. Arrived in Campus
    const campus: CandidateContact[] = manipalApps
      .filter((a) => {
        const isArrivedStatus = a.overallStatus === 'Arrived in Campus';
        const isCampusReported =
          (a as any).campus?.campusStatus === 'Arrived in Campus' ||
          (a as any).campus?.campusStatus === 'Arrived / Reported';
        return isArrivedStatus || isCampusReported;
      })
      .map((a) => ({
        id: a._id,
        name: a.candidateName,
        mobile: a.candidateMobile || (a.candidateId as any)?.mobileNumber || '—',
      }));

    return { registration, interview, selection, enrollment, campus };
  }, [manipalApps]);

  // Stage candidates for Crack-ED Process
  const crackedStagesData = useMemo(() => {
    // 1. Registration
    const registration: CandidateContact[] = crackedApps.map((a) => ({
      id: a._id,
      name: a.candidateName,
      mobile: a.candidateMobile || (a.candidateId as any)?.mobileNumber || '—',
    }));

    // 2. Interview Stage
    const interview: CandidateContact[] = crackedApps
      .filter((a) => {
        const hasInterview = a.interviewRounds && a.interviewRounds.length > 0;
        const inInterviewSt = ['Interview in Progress', 'Awaiting Interview', 'Referred'].includes(a.overallStatus);
        const reachedSelected = ['Selected', 'Arrived in Campus', 'Completed', 'Offer Letter Issued'].includes(a.overallStatus);
        return hasInterview || inInterviewSt || reachedSelected;
      })
      .map((a) => ({
        id: a._id,
        name: a.candidateName,
        mobile: a.candidateMobile || (a.candidateId as any)?.mobileNumber || '—',
      }));

    // 3. Bank Selection (Cleared Final Mock / L2 / HR selection)
    const isCrackedSelected = (a: Application) => {
      const hasRoundSelected = a.interviewRounds?.some(
        (r) => /l2|mock|final|hr/i.test(r.roundName) && (r.currentStatus === 'Selected' || r.result === 'Selected')
      );
      return Boolean(
        hasRoundSelected ||
        a.overallStatus === 'Selected' ||
        a.overallStatus === 'Arrived in Campus' ||
        (a.overallStatus as string) === 'Completed' ||
        (a as any).campus?.campusStatus === 'Arrived in Campus' ||
        (a as any).campus?.campusStatus === 'Offer Letter Issued'
      );
    };

    const selection: CandidateContact[] = crackedApps
      .filter((a) => isCrackedSelected(a))
      .map((a) => ({
        id: a._id,
        name: a.candidateName,
        mobile: a.candidateMobile || (a.candidateId as any)?.mobileNumber || '—',
      }));

    // 4. Enrollment Fee
    const enrollment: CandidateContact[] = crackedApps
      .filter((a) => {
        const isPaid =
          (a as any).payment?.paymentStatus === 'Paid' ||
          (a as any).paymentStatus === 'Paid' ||
          ((a as any).payment?.paidAmount || 0) > 0;
        return isCrackedSelected(a) && isPaid;
      })
      .map((a) => ({
        id: a._id,
        name: a.candidateName,
        mobile: a.candidateMobile || (a.candidateId as any)?.mobileNumber || '—',
      }));

    // 5. Success / Got Offer Letter
    const success: CandidateContact[] = crackedApps
      .filter((a) => {
        const isArrived = a.overallStatus === 'Arrived in Campus';
        const isCampusArrived =
          (a as any).campus?.campusStatus === 'Arrived in Campus' ||
          (a as any).campus?.campusStatus === 'Offer Letter Issued' ||
          (a as any).campus?.campusStatus === 'Arrived / Reported';
        const isCompleted = (a.overallStatus as string) === 'Completed' || (a as any).commissionStatus === 'Completed';
        const isSelectedAndPaid =
          a.overallStatus === 'Selected' &&
          ((a as any).payment?.paymentStatus === 'Paid' || (a as any).paymentStatus === 'Paid');
        return isArrived || isCampusArrived || isCompleted || isSelectedAndPaid;
      })
      .map((a) => ({
        id: a._id,
        name: a.candidateName,
        mobile: a.candidateMobile || (a.candidateId as any)?.mobileNumber || '—',
      }));

    return { registration, interview, selection, enrollment, success };
  }, [crackedApps]);

  // Active stages configuration based on chosen process
  const stages = useMemo(() => {
    if (activeProcess === 'MANIPAL') {
      return [
        {
          id: 1,
          title: 'Registration',
          subtitle: 'Profiles Sourced',
          count: manipalStagesData.registration.length,
          candidates: manipalStagesData.registration,
          icon: <UserPlus className="w-4 h-4 text-white" />,
          color: 'from-blue-600 to-indigo-600',
          active: manipalStagesData.registration.length > 0,
        },
        {
          id: 2,
          title: 'Interview Stage',
          subtitle: 'Technical & HR',
          count: manipalStagesData.interview.length,
          candidates: manipalStagesData.interview,
          icon: <CalendarCheck className="w-4 h-4 text-white" />,
          color: 'from-indigo-600 to-violet-600',
          active: manipalStagesData.interview.length > 0,
        },
        {
          id: 3,
          title: 'Bank Selection',
          subtitle: 'Cleared Final Round',
          count: manipalStagesData.selection.length,
          candidates: manipalStagesData.selection,
          icon: <Award className="w-4 h-4 text-white" />,
          color: 'from-emerald-500 to-teal-600',
          active: manipalStagesData.selection.length > 0,
        },
        {
          id: 4,
          title: 'Enrollment Fee',
          subtitle: 'Payment Confirmed',
          count: manipalStagesData.enrollment.length,
          candidates: manipalStagesData.enrollment,
          icon: <CreditCard className="w-4 h-4 text-white" />,
          color: 'from-amber-500 to-orange-500',
          active: manipalStagesData.enrollment.length > 0,
        },
        {
          id: 5,
          title: 'Arrived in Campus',
          subtitle: 'Campus Reporting',
          count: manipalStagesData.campus.length,
          candidates: manipalStagesData.campus,
          icon: <Building className="w-4 h-4 text-white" />,
          color: 'from-cyan-500 to-blue-500',
          active: manipalStagesData.campus.length > 0,
        },
      ];
    }

    // CRACKED Process Pipeline: Stage 5 is "Success / Got Offer Letter"
    return [
      {
        id: 1,
        title: 'Registration',
        subtitle: 'Profiles Sourced',
        count: crackedStagesData.registration.length,
        candidates: crackedStagesData.registration,
        icon: <UserPlus className="w-4 h-4 text-white" />,
        color: 'from-blue-600 to-indigo-600',
        active: crackedStagesData.registration.length > 0,
      },
      {
        id: 2,
        title: 'Interview Stage',
        subtitle: 'Technical & HR',
        count: crackedStagesData.interview.length,
        candidates: crackedStagesData.interview,
        icon: <CalendarCheck className="w-4 h-4 text-white" />,
        color: 'from-indigo-600 to-violet-600',
        active: crackedStagesData.interview.length > 0,
      },
      {
        id: 3,
        title: 'Bank Selection',
        subtitle: 'Cleared Final Round',
        count: crackedStagesData.selection.length,
        candidates: crackedStagesData.selection,
        icon: <Award className="w-4 h-4 text-white" />,
        color: 'from-emerald-500 to-teal-600',
        active: crackedStagesData.selection.length > 0,
      },
      {
        id: 4,
        title: 'Enrollment Fee',
        subtitle: 'Payment Confirmed',
        count: crackedStagesData.enrollment.length,
        candidates: crackedStagesData.enrollment,
        icon: <CreditCard className="w-4 h-4 text-white" />,
        color: 'from-amber-500 to-orange-500',
        active: crackedStagesData.enrollment.length > 0,
      },
      {
        id: 5,
        title: 'Success / Got Offer Letter',
        subtitle: 'Offer Letter Issued / Placed',
        count: crackedStagesData.success.length,
        candidates: crackedStagesData.success,
        icon: <Briefcase className="w-4 h-4 text-white" />,
        color: 'from-emerald-500 to-teal-600',
        active: crackedStagesData.success.length > 0,
      },
    ];
  }, [activeProcess, manipalStagesData, crackedStagesData]);

  const regCount = stages[0]?.count || 0;
  const selectedCount = stages[2]?.count || 0;
  const finalStageCount = stages[4]?.count || 0;

  const handleCopyMobile = (mobile: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(mobile);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStageClick = (stage: typeof stages[0]) => {
    setSelectedStage({
      id: stage.id,
      title: stage.title,
      subtitle: stage.subtitle,
      candidates: stage.candidates,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-fic-border p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Header with Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base font-bold text-fic-navy">Candidate Placement Lifecycle Pipeline</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Stage-by-stage progression. Click any stage to quickly view candidate name and mobile number.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* SEPARATE PIPELINE SWITCHER TABS */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setActiveProcess('MANIPAL');
                setSelectedStage(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeProcess === 'MANIPAL'
                  ? 'bg-fic-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>🎓 Manipal BFSI Pipeline</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeProcess === 'MANIPAL'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {manipalApps.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveProcess('CRACKED');
                setSelectedStage(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeProcess === 'CRACKED'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>⚡ Crack-ED Pipeline</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeProcess === 'CRACKED'
                    ? 'bg-amber-800 text-amber-100'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {crackedApps.length}
              </span>
            </button>
          </div>

          {/* Dynamic Conversion Rate based on active pipeline */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>{activeProcess === 'MANIPAL' ? 'Manipal' : 'Crack-ED'} Conversion:</span>
            <span className="text-emerald-600 font-bold">
              {regCount > 0 ? `${Math.round((selectedCount / regCount) * 100)}%` : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Timeline Track */}
      <div className="relative pt-4 pb-2">
        <div className="sm:hidden text-right text-[11px] text-slate-400 mb-2 font-medium">
          👉 Swipe across all 5 stages
        </div>
        {/* Background Connector Line */}
        <div className="absolute top-9 left-6 right-6 h-1.5 bg-slate-100 rounded-full hidden md:block" />

        {/* Active Connector Line */}
        <div
          className={`absolute top-9 left-6 w-[85%] h-1.5 bg-gradient-to-r ${
            activeProcess === 'MANIPAL'
              ? 'from-blue-600 via-emerald-500 to-cyan-500'
              : 'from-blue-600 via-amber-500 to-emerald-500'
          } rounded-full hidden md:block shadow-xs transition-all`}
        />

        {/* Stages Carousel/Grid */}
        <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-5 overflow-x-auto sm:overflow-visible pb-3 sm:pb-0 gap-3 sm:gap-4 relative z-10 scrollbar-none snap-x">
          {stages.map((stage) => (
            <div
              key={stage.id}
              onClick={() => handleStageClick(stage)}
              className="flex flex-col items-center text-center p-3 rounded-xl hover:bg-blue-50/60 cursor-pointer border border-slate-200/60 sm:border-transparent hover:border-blue-200 hover:shadow-md transition-all group select-none min-w-[140px] sm:min-w-0 flex-1 snap-start bg-slate-50/50 sm:bg-transparent"
              title="Click to view candidate contacts"
            >
              {/* Milestone Icon Node */}
              <div className="relative mb-3">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md bg-gradient-to-br ${stage.color} group-hover:scale-110 transition-transform duration-200 ring-4 ring-white`}
                >
                  {stage.icon}
                </div>
                {stage.active && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                )}
              </div>

              {/* Stage Info */}
              <div className="text-xs font-bold text-slate-800 leading-tight group-hover:text-fic-navy transition-colors">
                {stage.title}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">{stage.subtitle}</div>

              {/* Candidate Count Badge */}
              <div className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 group-hover:bg-blue-100/70 text-xs font-bold text-slate-800 group-hover:text-fic-navy transition-colors border border-slate-200">
                <span>{stage.count}</span>
                <span className="text-[10px] text-slate-400 font-normal">candidates</span>
              </div>

              <div className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 font-medium mt-1.5 transition-opacity">
                Click to view
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QUICK CANDIDATE CONTACT MODAL (Name & Mobile Number Alone) */}
      <Modal
        isOpen={!!selectedStage}
        onClose={() => setSelectedStage(null)}
        title={`${activeProcess === 'MANIPAL' ? '🎓 Manipal BFSI' : '⚡ Crack-ED'} — ${selectedStage?.title} (${selectedStage?.subtitle})`}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-600 font-medium">
              Candidate Name &amp; Contact Details:
            </span>
            <span className="font-bold text-fic-navy bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs">
              {selectedStage?.candidates.length || 0} candidate{(selectedStage?.candidates.length || 0) === 1 ? '' : 's'}
            </span>
          </div>

          {loadingApps ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-slate-500 text-xs">
              <div className="w-6 h-6 border-2 border-fic-navy border-t-transparent rounded-full animate-spin" />
              <span>Loading stage candidates...</span>
            </div>
          ) : selectedStage && selectedStage.candidates.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
                  <tr className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Candidate Name</th>
                    <th className="py-2.5 px-3 text-right">Mobile Number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedStage.candidates.map((c, i) => (
                    <tr key={c.id || i} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-center text-xs font-mono text-slate-400">
                        {i + 1}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {c.name}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <a
                            href={`tel:${c.mobile}`}
                            className="hover:text-blue-600 flex items-center gap-1"
                            title="Call candidate"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-400 hover:text-blue-600" />
                            <span>{c.mobile}</span>
                          </a>
                          {c.mobile !== '—' && (
                            <button
                              type="button"
                              onClick={(e) => handleCopyMobile(c.mobile, c.id, e)}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                              title="Copy mobile number"
                            >
                              {copiedId === c.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              No candidates currently recorded in this stage.
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button size="sm" variant="secondary" onClick={() => setSelectedStage(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PlacementPipelineTimeline;
