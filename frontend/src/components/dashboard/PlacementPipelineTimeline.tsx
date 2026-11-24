import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  X,
  ExternalLink,
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
];

export const PlacementPipelineTimeline: React.FC<PlacementPipelineTimelineProps> = ({
  stats,
  applications: propApplications,
}) => {
  const [internalApps, setInternalApps] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [selectedStage, setSelectedStage] = useState<{
    id: number;
    title: string;
    subtitle: string;
    candidates: CandidateContact[];
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const apps = (propApplications && propApplications.length > 0) ? propApplications : internalApps;

  // Extract candidate contacts by stage
  const stageCandidatesMap = useMemo(() => {
    // Stage 1: Registration (All sourced candidates)
    const registrationList: CandidateContact[] = apps.map((a) => ({
      id: a._id,
      name: a.candidateName,
      mobile: a.candidateMobile || (a.candidateId as any)?.mobileNumber || '—',
    }));

    // Stage 2: Interview Stage (Entered or completed interview process)
    const interviewList: CandidateContact[] = apps
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

    // Helper: checks if candidate was selected in L2 or Final Mock round (or overallStatus === 'Selected')
    const isBankSelected = (a: Application) => {
      const hasRoundSelected = a.interviewRounds?.some(
        (r) => /l2|mock|final/i.test(r.roundName) && (r.currentStatus === 'Selected' || r.result === 'Selected')
      );
      return Boolean(hasRoundSelected || a.overallStatus === 'Selected');
    };

    // Stage 3: Bank Selection (Strictly based on L2 or Final Mock selection, NOT campus arrival)
    const selectionList: CandidateContact[] = apps
      .filter((a) => isBankSelected(a))
      .map((a) => ({
        id: a._id,
        name: a.candidateName,
        mobile: a.candidateMobile || (a.candidateId as any)?.mobileNumber || '—',
      }));

    // Stage 4: Enrollment Fee (Candidate must be Bank Selected AND fee payment status is Paid)
    const enrollmentList: CandidateContact[] = apps
      .filter((a) => {
        const selected = isBankSelected(a);
        const isPaid = (a as any).payment?.paymentStatus === 'Paid' || (a as any).paymentStatus === 'Paid';
        return selected && isPaid;
      })
      .map((a) => ({
        id: a._id,
        name: a.candidateName,
        mobile: a.candidateMobile || (a.candidateId as any)?.mobileNumber || '—',
      }));

    // Stage 5: Arrived in Campus (Campus reported & onboarding confirmed)
    const campusList: CandidateContact[] = apps
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

    return {
      registration: registrationList,
      interview: interviewList,
      selection: selectionList,
      enrollment: enrollmentList,
      campus: campusList,
    };
  }, [apps]);

  // Stage counts rendered directly from stats (immediate, zero network lag)
  const regCount = stats?.totalApplications ?? stageCandidatesMap.registration.length;
  const interviewCount =
    (stats?.interviews?.scheduled || 0) +
    (stats?.byStatus?.['Interview in Progress'] || 0) +
    (stats?.selected || 0) || stageCandidatesMap.interview.length;
  const selectedCount = stats?.selected ?? stageCandidatesMap.selection.length;
  const enrolledCount = stats?.enrolled ?? stageCandidatesMap.enrollment.length;
  const campusCount =
    stats?.campus?.['Arrived in Campus'] ||
    stats?.byStatus?.['Arrived in Campus'] ||
    stageCandidatesMap.campus.length;

  const stages = [
    {
      id: 1,
      title: 'Registration',
      subtitle: 'Profiles Sourced',
      count: regCount,
      candidates: stageCandidatesMap.registration,
      icon: <UserPlus className="w-4 h-4 text-white" />,
      color: 'from-blue-600 to-indigo-600',
      active: true,
    },
    {
      id: 2,
      title: 'Interview Stage',
      subtitle: 'Technical & HR',
      count: interviewCount,
      candidates: stageCandidatesMap.interview,
      icon: <CalendarCheck className="w-4 h-4 text-white" />,
      color: 'from-indigo-600 to-violet-600',
      active: interviewCount > 0,
    },
    {
      id: 3,
      title: 'Bank Selection',
      subtitle: 'Cleared Final Round',
      count: selectedCount,
      candidates: stageCandidatesMap.selection,
      icon: <Award className="w-4 h-4 text-white" />,
      color: 'from-emerald-500 to-teal-600',
      active: selectedCount > 0,
    },
    {
      id: 4,
      title: 'Enrollment Fee',
      subtitle: 'Payment Confirmed',
      count: enrolledCount,
      candidates: stageCandidatesMap.enrollment,
      icon: <CreditCard className="w-4 h-4 text-white" />,
      color: 'from-amber-500 to-orange-500',
      active: enrolledCount > 0,
    },
    {
      id: 5,
      title: 'Arrived in Campus',
      subtitle: 'Campus Reporting',
      count: campusCount,
      candidates: stageCandidatesMap.campus,
      icon: <Building className="w-4 h-4 text-white" />,
      color: 'from-cyan-500 to-blue-500',
      active: campusCount > 0,
    },
  ];

  const handleCopyMobile = (mobile: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(mobile);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStageClick = async (stage: typeof stages[0]) => {
    setSelectedStage(stage);
    if (internalApps.length === 0 && (!propApplications || propApplications.length === 0)) {
      setLoadingApps(true);
      try {
        const res = await applicationsApi.list({ limit: '100' });
        if (res.success && res.data) {
          setInternalApps(res.data);
        }
      } catch {}
      finally {
        setLoadingApps(false);
      }
    }
  };

  const currentStageCandidates = useMemo(() => {
    if (!selectedStage) return [];
    switch (selectedStage.id) {
      case 1:
        return stageCandidatesMap.registration;
      case 2:
        return stageCandidatesMap.interview;
      case 3:
        return stageCandidatesMap.selection;
      case 4:
        return stageCandidatesMap.enrollment;
      case 5:
        return stageCandidatesMap.campus;
      default:
        return selectedStage.candidates;
    }
  }, [selectedStage, stageCandidatesMap]);

  return (
    <div className="bg-white rounded-2xl border border-fic-border p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
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

        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Overall Conversion Rate:</span>
          <span className="text-emerald-600 font-bold">
            {regCount > 0 ? `${Math.round((selectedCount / regCount) * 100)}%` : '0%'}
          </span>
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
          className="absolute top-9 left-6 w-[85%] h-1.5 bg-gradient-to-r from-blue-600 via-emerald-500 to-fic-yellow rounded-full hidden md:block shadow-xs"
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
        title={`${selectedStage?.title} (${selectedStage?.subtitle})`}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-600 font-medium">
              Candidate Name &amp; Contact Details:
            </span>
            <span className="font-bold text-fic-navy bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs">
              {currentStageCandidates.length} candidate{currentStageCandidates.length === 1 ? '' : 's'}
            </span>
          </div>

          {loadingApps ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-slate-500 text-xs">
              <div className="w-6 h-6 border-2 border-fic-navy border-t-transparent rounded-full animate-spin" />
              <span>Loading stage candidates...</span>
            </div>
          ) : currentStageCandidates.length > 0 ? (
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
                  {currentStageCandidates.map((c, i) => (
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
