"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getPlansByAgent, deletePlan, Plan, STORAGE_KEY } from './plan-storage';
import { Agent } from './types';

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

// ---------- PLAN CARD COMPONENT ----------
function PlanCard({ 
  plan, 
  agent, 
  onEdit, 
  onDelete 
}: { 
  plan: Plan; 
  agent: Agent; 
  onEdit: () => void;
  onDelete: () => void;
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
      if (cfg.billingType === 'FLAT') {
        return `${ind.name}: ${formatPrice(cfg.price * 100, plan.currency)}/${unitText}`;
      } else {
        const tierCount = cfg.tiers?.length || 0;
        return `${ind.name}: ${cfg.billingType} (${tierCount} tiers)`;
      }
    })
    .filter(Boolean);

  return (
    <div className="bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow overflow-hidden">
      {/* Header with plan name and badge */}
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg text-gray-900">{plan.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {plan.billingFrequency}
          </span>
        </div>
      </div>

      {/* Price */}
      <div className="px-5 pt-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900">
            {formatPrice(plan.basePrice, plan.currency)}
          </span>
          <span className="text-sm text-gray-500">
            /{plan.billingFrequency.toLowerCase()}
          </span>
        </div>
      </div>

      {/* Features list */}
      <div className="px-5 py-4">
        <div className="space-y-2 text-sm">
          {plan.setupFee.enabled && (
            <div className="flex items-center gap-2 text-gray-600">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Setup fee: {formatPrice(plan.setupFee.price, plan.currency)}
            </div>
          )}
          
          {plan.seatBased.enabled && (
            <div className="flex items-center gap-2 text-gray-600">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Seats: {formatPrice(plan.seatBased.price * 100, plan.currency)}/seat
              {plan.seatBased.includedUsage > 0 && ` (${plan.seatBased.includedUsage} included)`}
            </div>
          )}

          {indicatorSummaries.map((summary, i) => (
            <div key={i} className="flex items-center gap-2 text-gray-600">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {summary}
            </div>
          ))}

          {(plan.hardLimits.tokensPerMonth > 0 || plan.hardLimits.apiCallsPerMonth > 0) && (
            <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
              Limits: {plan.hardLimits.tokensPerMonth.toLocaleString()} tokens / {plan.hardLimits.apiCallsPerMonth.toLocaleString()} API calls
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:bg-indigo-50 rounded-lg transition"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 font-medium hover:bg-red-50 rounded-lg transition"
        >
          Delete
        </button>
      </div>

      <div className="px-5 pb-4 text-xs text-gray-400">
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
      setPlans(prev => prev.filter(p => p.id !== planId));
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
    <div className="min-h-screen bg-gray-50">
      {/* Header with gradient */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
              <p className="text-sm text-gray-500 mt-1">{agent.description}</p>
            </div>
            <Link
              href={`/agents/${agentId}/plans/new`}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Plan
            </Link>
          </div>
          
          {/* Agent meta info */}
          <div className="flex gap-4 mt-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {agent.agentType}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {agent.status}
            </span>
            <span className="text-xs text-gray-400">
              External ID: {agent.externalId}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No plans yet</h3>
            <p className="text-gray-500 mb-6">Create your first pricing plan for {agent.name}.</p>
            <Link
              href={`/agents/${agentId}/plans/new`}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create your first plan
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                agent={agent}
                onEdit={() => handleEdit(plan.id)}
                onDelete={() => handleDelete(plan.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}