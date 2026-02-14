"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getPlansByAgent, deletePlan, STORAGE_KEY } from './plan-storage';
import { Agent, Plan } from './types';

// ---------- STATIC AGENT DATA ----------
const agents: Record<string, Agent> = {
  "kanu": {
    id: "24e9a167-eeac-49df-b912-18355136f11f",
    name: "Kanu",
    description: "helllo world",
    externalId: "kan_id",
    status: "Live",
    agentType: "normal",
    indicators: [
      {
        id: "1770918079308",
        name: "message-sent",
        type: "ACTIVITY",
        humanValueEquivalent: 1,
        perMinuteEnabled: false,
      },
      {
        id: "1770960227498",
        name: "article-generated",
        type: "OUTCOME",
        humanValueEquivalent: 2,
        perMinuteEnabled: false,
      },
    ],
  },
  "manu": {
    id: "f4ee5548-4462-416f-a5dc-fb8354c7b6b2",
    name: "Manu",
    description: "Voice and text to speech",
    externalId: "manu_id",
    status: "Live",
    agentType: "voice",
    indicators: [
      {
        id: "1770967230303",
        name: "voice-generated",
        type: "OUTCOME",
        humanValueEquivalent: 1,
        perMinuteEnabled: true,
      },
    ],
  },
};

// ---------- FORMAT CURRENCY ----------
const formatPrice = (price: number, currency: string = 'INR') => {
  const rupees = price / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(rupees);
};

// ---------- INVOICE PREVIEW MODAL ----------
function InvoicePreviewModal({
  plan,
  agent,
  onClose,
  sampleSeats,
  onSeatsChange
}: {
  plan: Plan;
  agent: Agent;
  onClose: () => void;
  sampleSeats: number;
  onSeatsChange: (seats: number) => void;
}) {
  const calculateBreakdown = () => {
    let baseCharge = plan.basePrice;
    let seatCharge = 0;
    const indicatorCharges: Record<string, number> = {};
    let setupFee = plan.setupFee.enabled ? plan.setupFee.price : 0;
    let platformFee = plan.platformFee.enabled ? plan.platformFee.price : 0;

    // Seat-based charges
    if (plan.seatBased.enabled) {
      const chargeableSeats = Math.max(sampleSeats, plan.seatBased.minimumCommitment);
      const includedSeats = plan.seatBased.includedUsage;
      const extra = Math.max(0, chargeableSeats - includedSeats);
      seatCharge = (extra * plan.seatBased.price) / 100;
    }

    // Activity and outcome indicators
    const processIndicators = (type: 'ACTIVITY' | 'OUTCOME') => {
      agent.indicators
        .filter((ind) => ind.type === type)
        .forEach((indicator) => {
          const config = type === 'ACTIVITY' ? plan.activityBased[indicator.id] : plan.outcomeBased[indicator.id];
          if (!config?.enabled) return;

          const sampleUsage = indicator.humanValueEquivalent * 1000;
          const included = config.includedUsage;
          const overage = Math.max(0, sampleUsage - included);

          if (config.billingType === 'FLAT') {
            const cost = (overage * config.price) / 100;
            if (cost > 0) {
              indicatorCharges[indicator.name] = cost;
            }
          }
        });
    };

    processIndicators('ACTIVITY');
    processIndicators('OUTCOME');

    const subtotal = baseCharge + seatCharge + Object.values(indicatorCharges).reduce((a, b) => a + b, 0);
    const total = subtotal + setupFee + platformFee;

    return {
      baseCharge,
      seatCharge,
      indicatorCharges,
      setupFee,
      platformFee,
      subtotal,
      total
    };
  };

  const breakdown = calculateBreakdown();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">{plan.name} - Invoice Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Sample Seats Input */}
          {plan.seatBased.enabled && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Number of Sample Seats</label>
              <input
                type="number"
                value={sampleSeats}
                onChange={(e) => onSeatsChange(Math.max(1, Number(e.target.value)))}
                className="w-full border border-blue-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                min="1"
              />
              <p className="text-xs text-gray-600 mt-2">Adjust to see how pricing changes with different seat counts</p>
            </div>
          )}

          {/* Breakdown */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Pricing Breakdown</h3>
            </div>
            <div className="divide-y divide-gray-200 p-4 space-y-3">
              {/* Base Price */}
              <div className="flex justify-between">
                <span className="text-gray-700">Base Price:</span>
                <span className="font-semibold text-gray-900">{formatPrice(breakdown.baseCharge, plan.currency)}</span>
              </div>

              {/* Seat Charge */}
              {plan.seatBased.enabled && (
                <div className="flex justify-between pt-2">
                  <span className="text-gray-700">Seat Charge ({Math.max(sampleSeats, plan.seatBased.minimumCommitment)} seats):</span>
                  <span className="font-semibold text-gray-900">{formatPrice(breakdown.seatCharge * 100, plan.currency)}</span>
                </div>
              )}

              {/* Indicator Charges */}
              {Object.entries(breakdown.indicatorCharges).map(([name, cost]) => (
                <div key={name} className="flex justify-between pt-2">
                  <span className="text-gray-700">{name} (usage-based):</span>
                  <span className="font-semibold text-gray-900">{formatPrice(cost * 100, plan.currency)}</span>
                </div>
              ))}

              {/* Subtotal */}
              <div className="flex justify-between pt-3 border-t-2 border-gray-200 font-semibold">
                <span>Subtotal:</span>
                <span>{formatPrice(breakdown.subtotal * 100, plan.currency)}</span>
              </div>

              {/* Setup Fee */}
              {plan.setupFee.enabled && breakdown.setupFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Setup Fee:</span>
                  <span className="font-semibold text-gray-900">{formatPrice(breakdown.setupFee, plan.currency)}</span>
                </div>
              )}

              {/* Platform Fee */}
              {plan.platformFee.enabled && breakdown.platformFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Platform Fee:</span>
                  <span className="font-semibold text-gray-900">{formatPrice(breakdown.platformFee, plan.currency)}</span>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between pt-3 border-t-2 border-emerald-200 bg-emerald-50 -mx-4 px-4 py-3 text-lg font-bold">
                <span>Total ({plan.billingFrequency}):</span>
                <span className="text-emerald-700">{formatPrice(breakdown.total * 100, plan.currency)}</span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- PLAN CARD COMPONENT ----------
function PlanCard({ 
  plan, 
  agent, 
  onEdit, 
  onDelete,
  onPreview
}: { 
  plan: Plan; 
  agent: Agent; 
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  // Build summary of indicator pricing
  const indicatorSummaries = agent.indicators
    .map((ind) => {
      const cfg =
        ind.type === 'ACTIVITY'
          ? plan.activityBased[ind.id]
          : plan.outcomeBased[ind.id];
      if (!cfg?.enabled) return null;

      const unitText = ind.perMinuteEnabled ? 'min' : 'unit';
      let summary = '';
      if (cfg.billingType === 'FLAT') {
        summary = `${ind.name}: ${formatPrice(cfg.price * 100, plan.currency)}/${unitText}`;
      } else {
        const tierCount = cfg.tiers?.length || 0;
        summary = `${ind.name}: ${cfg.billingType} (${tierCount} tiers)`;
      }
      
      // Add model override indicator if present
      if (cfg.modelOverrides && Object.keys(cfg.modelOverrides).length > 0) {
        const modelCount = Object.keys(cfg.modelOverrides).length;
        summary += ` (${modelCount} model ${modelCount === 1 ? 'override' : 'overrides'})`;
      }
      
      return summary;
    })
    .filter(Boolean);

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col h-full">
      {/* Premium gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Header with plan name and badge */}
      <div className="px-6 pt-6 pb-5 border-b border-gray-100 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-xl text-gray-900 tracking-tight">{plan.name}</h3>
            {plan.description && (
              <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
            )}
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 whitespace-nowrap">
            {plan.billingFrequency}
          </span>
        </div>
      </div>

      {/* Price section */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-gray-900">
            {formatPrice(plan.basePrice, plan.currency)}
          </span>
          <span className="text-sm font-medium text-gray-500">
            /{plan.billingFrequency.toLowerCase()}
          </span>
        </div>
      </div>

      {/* Features list */}
      <div className="px-6 py-6 flex-1 overflow-y-auto">
        <div className="space-y-3">
          {plan.setupFee.enabled && (
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="text-sm">
                <p className="text-gray-700 font-medium">Setup fee</p>
                <p className="text-gray-500">{formatPrice(plan.setupFee.price, plan.currency)}</p>
              </div>
            </div>
          )}
          
          {plan.seatBased.enabled && (
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="text-sm">
                <p className="text-gray-700 font-medium">Seats</p>
                <p className="text-gray-500">{formatPrice(plan.seatBased.price, plan.currency)}/seat
                  {plan.seatBased.includedUsage > 0 && ` (${plan.seatBased.includedUsage} included)`}
                </p>
              </div>
            </div>
          )}

          {indicatorSummaries.map((summary, i) => (
            <div key={i} className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-gray-700">{summary}</p>
            </div>
          ))}

          {(plan.hardLimits.tokensPerMonth > 0 || plan.hardLimits.apiCallsPerMonth > 0) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Limits</p>
              <div className="space-y-1 text-xs text-gray-600">
                {plan.hardLimits.tokensPerMonth > 0 && (
                  <p>{plan.hardLimits.tokensPerMonth.toLocaleString()} tokens/month</p>
                )}
                {plan.hardLimits.apiCallsPerMonth > 0 && (
                  <p>{plan.hardLimits.apiCallsPerMonth.toLocaleString()} API calls/month</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition duration-200"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition duration-200"
          >
            Delete
          </button>
        </div>
        <button
          onClick={onPreview}
          className="w-full px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Invoice Preview
        </button>
      </div>

      <div className="px-6 pb-4 text-xs text-gray-400">
        Updated {new Date(plan.updatedAt).toLocaleDateString()}
      </div>
    </div>
  );
}

// ---------- MAIN PAGE ----------
export default function PlansListPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewPlanId, setPreviewPlanId] = useState<string | null>(null);
  const [previewSampleSeats, setPreviewSampleSeats] = useState(10);
  
  const agent = agents[agentId];

  // Load plans from localStorage
  useEffect(() => {
    const loadPlans = () => {
      setIsLoading(true);
      const agentPlans = getPlansByAgent(agentId);
      setPlans(agentPlans);
      setIsLoading(false);
    };

    loadPlans();

    // Listen for storage changes (if multiple tabs open)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadPlans();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [agentId]);

  const handleDelete = (planId: string) => {
    if (confirm('Are you sure you want to delete this plan?')) {
      deletePlan(planId);
      setPlans((prev: Plan[]) => prev.filter(p => p.id !== planId));
    }
  };

  const handleEdit = (planId: string) => {
    router.push(`/agents/${agentId}/plans/new?edit=${planId}`);
  };

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Agent not found</h2>
          <p className="text-gray-600 mt-2">The agent you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{agent.name}</h1>
              <p className="text-base text-gray-600 mt-2">{agent.description}</p>
            </div>
            <Link
              href={`/agents/${agentId}/plans/new`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition shadow-lg hover:shadow-xl font-semibold whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Plan
            </Link>
          </div>
          
          {/* Agent meta info */}
          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-100">
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 uppercase tracking-wide">
              {agent.agentType}
            </span>
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 uppercase tracking-wide">
              {agent.status}
            </span>
            <span className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium text-gray-500">
              ID: <span className="font-mono ml-1">{agent.externalId}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-emerald-200 border-t-emerald-600 mb-4"></div>
              <p className="text-gray-600 font-medium">Loading plans...</p>
            </div>
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No plans created yet</h3>
            <p className="text-gray-600 mb-8 max-w-sm mx-auto">Get started by creating your first pricing plan for {agent.name}. Define pricing tiers, features, and billing options.</p>
            <Link
              href={`/agents/${agentId}/plans/new`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition shadow-lg hover:shadow-xl font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create your first plan
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                agent={agent}
                onEdit={() => handleEdit(plan.id)}
                onDelete={() => handleDelete(plan.id)}
                onPreview={() => setPreviewPlanId(plan.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Invoice Preview Modal */}
      {previewPlanId && (
        <InvoicePreviewModal
          plan={plans.find((p) => p.id === previewPlanId)!}
          agent={agent}
          onClose={() => setPreviewPlanId(null)}
          sampleSeats={previewSampleSeats}
          onSeatsChange={setPreviewSampleSeats}
        />
      )}
    </div>
  );
}
