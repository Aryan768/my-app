"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Agent , Plan, BillingType, BillingFrequency, Tier} from '../types';
import { getPlans, getPlan, savePlan } from '../plan-storage';
// import { getPlan, savePlan, getPlans } from '../../plan-storage';
// import { Agent, Plan, BillingType, BillingFrequency, Tier } from '../../types';

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

// ---------- PRESETS ----------
const PRESETS = {
  Starter: {
    name: "Starter",
    basePrice: 0,
    seatBased: { enabled: false },
    activityBased: {},
    outcomeBased: {},
    hardLimits: { tokensPerMonth: 100000, apiCallsPerMonth: 1000 },
  },
  Growth: {
    name: "Growth",
    basePrice: 49900,
    seatBased: { enabled: true, price: 1000, includedUsage: 3, minimumCommitment: 12 },
    activityBased: {
      "1770918079308": { enabled: true, price: 2, includedUsage: 3 },
    },
    outcomeBased: {
      "1770960227498": { enabled: true, price: 2, includedUsage: 2 },
    },
    hardLimits: { tokensPerMonth: 500000, apiCallsPerMonth: 5000 },
  },
  Enterprise: {
    name: "Enterprise",
    basePrice: 199900,
    seatBased: { enabled: true, price: 800, includedUsage: 10, minimumCommitment: 50 },
    activityBased: {
      "1770918079308": { enabled: true, price: 1, includedUsage: 1000 },
    },
    outcomeBased: {
      "1770960227498": { enabled: true, price: 1, includedUsage: 500 },
    },
    hardLimits: { tokensPerMonth: 5000000, apiCallsPerMonth: 50000 },
  },
  "Voice PayGo": {
    name: "Voice PayGo",
    basePrice: 0,
    seatBased: { enabled: false },
    activityBased: {},
    outcomeBased: {
      "1770967230303": {
        enabled: true,
        billingType: "VOLUME",
        price: 5,
        billingFrequency: "Quarterly",
        includedUsage: 0,
        rounding: 'ceil',
        tiers: [
          { id: "t1", from: 1, to: 5, units: 0, price: 10 },
          { id: "t2", from: 6, to: 10, units: 0, price: 8 },
          { id: "t3", from: 11, to: 0, units: 0, price: 5 },
        ],
      },
    },
    hardLimits: { tokensPerMonth: 1000000, apiCallsPerMonth: 10000 },
  },
};

// ---------- HELPER: create empty plan ----------
const createEmptyPlan = (agentId: string): Plan => ({
  id: '',
  agentId,
  name: '',
  slug: '',
  description: '',
  billingFrequency: 'Monthly',
  currency: 'INR',
  basePrice: 0,
  setupFee: { enabled: false, price: 0 },
  platformFee: { enabled: false, price: 0, billingFrequency: 'Monthly' },
  seatBased: {
    enabled: false,
    billingType: 'FLAT',
    price: 0,
    billingFrequency: 'Monthly',
    minimumCommitment: 0,
    includedUsage: 0,
  },
  activityBased: {},
  outcomeBased: {},
  hardLimits: { tokensPerMonth: 0, apiCallsPerMonth: 0 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ---------- FORMAT CURRENCY ----------
const formatPrice = (price: number, currency: string = 'INR') => {
  const rupees = price / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(rupees);
};

// ---------- VALIDATION ----------
const validatePlan = (plan: Plan, agentId: string): string | null => {
  const existing = getPlans().filter(p => p.agentId === agentId && p.id !== plan.id);
  if (existing.some(p => p.name.toLowerCase() === plan.name.toLowerCase())) {
    return 'A plan with this name already exists for this agent.';
  }
  if (existing.some(p => p.slug.toLowerCase() === plan.slug.toLowerCase())) {
    return 'A plan with this slug already exists for this agent.';
  }
  return null;
};

// ---------- MAIN CREATE/EDIT PAGE ----------
function CreatePlanContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentId = params.agentId as string;
  const editId = searchParams.get('edit');
  
  const agent = agents[agentId];
  
  const [plan, setPlan] = useState<Plan>(() => createEmptyPlan(agentId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!editId);
  const [sampleSeats, setSampleSeats] = useState<number>(1);

  // Load plan if editing
  useEffect(() => {
    if (editId) {
      const existingPlan = getPlan(editId);
      if (existingPlan && existingPlan.agentId === agentId) {
        setPlan(existingPlan);
      } else {
        router.push(`/agents/${agentId}/plans`);
      }
      setIsLoading(false);
    }
  }, [editId, agentId, router]);

  if (!agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-6xl mx-auto text-center py-12">
          <h2 className="text-3xl font-bold text-gray-900">Agent not found</h2>
          <p className="text-gray-600 mt-2 text-lg">The agent you're looking for doesn't exist.</p>
          <Link
            href="/agents"
            className="inline-block mt-6 text-emerald-600 hover:text-emerald-700 font-semibold"
          >
            ← Back to agents
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-6xl mx-auto text-center py-12">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-emerald-200 border-t-emerald-600"></div>
          <p className="text-gray-600 font-medium mt-4">Loading plan...</p>
        </div>
      </div>
    );
  }

  // ---------- Handlers ----------
  const updatePlan = <K extends keyof Plan>(field: K, value: Plan[K]) => {
    setPlan((prev: Plan) => ({ ...prev, [field]: value, updatedAt: new Date().toISOString() }));
  };

  const updateSetupFee = (updates: Partial<typeof plan.setupFee>) =>
    setPlan((prev: Plan) => ({ 
      ...prev, 
      setupFee: { ...prev.setupFee, ...updates },
      updatedAt: new Date().toISOString() 
    }));

  const updatePlatformFee = (updates: Partial<typeof plan.platformFee>) =>
    setPlan((prev: Plan) => ({ 
      ...prev, 
      platformFee: { ...prev.platformFee, ...updates },
      updatedAt: new Date().toISOString() 
    }));

  const updateSeatBased = (updates: Partial<typeof plan.seatBased>) =>
    setPlan((prev: Plan) => ({ 
      ...prev, 
      seatBased: { ...prev.seatBased, ...updates },
      updatedAt: new Date().toISOString() 
    }));

  const updateIndicator = (
    type: 'activityBased' | 'outcomeBased',
    indicatorId: string,
    updates: Partial<any>
  ) => {
    setPlan((prev: Plan) => {
      const current = prev[type][indicatorId] || {
        enabled: false,
        billingType: 'FLAT',
        price: 0,
        billingFrequency: 'Monthly',
        includedUsage: 0,
        tiers: [],
        rounding: 'ceil',
      };
      return {
        ...prev,
        [type]: {
          ...prev[type],
          [indicatorId]: { ...current, ...updates },
        },
        updatedAt: new Date().toISOString()
      };
    });
  };

  const addTier = (type: 'activityBased' | 'outcomeBased', indicatorId: string) => {
    const current = plan[type][indicatorId];
    const newTier: Tier = {
      id: `tier_${Date.now()}_${Math.random()}`,
      from: 1,
      to: 0,
      units: 0,
      price: 0,
    };
    updateIndicator(type, indicatorId, {
      tiers: [...(current?.tiers || []), newTier],
    });
  };

  const updateTier = (
    type: 'activityBased' | 'outcomeBased',
    indicatorId: string,
    tierId: string,
    field: keyof Tier,
    value: number
  ) => {
    const current = plan[type][indicatorId];
    if (!current) return;
    const updatedTiers = (current.tiers || []).map((t: Tier) =>
      t.id === tierId ? { ...t, [field]: value } : t
    );
    updateIndicator(type, indicatorId, { tiers: updatedTiers });
  };

  const removeTier = (type: 'activityBased' | 'outcomeBased', indicatorId: string, tierId: string) => {
    const current = plan[type][indicatorId];
    if (!current) return;
    updateIndicator(type, indicatorId, {
      tiers: (current.tiers || []).filter((t: Tier) => t.id !== tierId),
    });
  };

  const applyPreset = (presetName: keyof typeof PRESETS) => {
    const preset = PRESETS[presetName];
    if (!preset) return;

    const newPlan = createEmptyPlan(agentId);
    newPlan.name = preset.name;
    // Auto-generate slug from preset name
    newPlan.slug = preset.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    newPlan.basePrice = preset.basePrice;
    newPlan.seatBased = { ...newPlan.seatBased, ...preset.seatBased };
    newPlan.hardLimits = { ...newPlan.hardLimits, ...preset.hardLimits };

    agent.indicators.forEach((ind) => {
      if (ind.type === 'ACTIVITY' && (preset.activityBased as any)[ind.id]) {
        newPlan.activityBased[ind.id] = {
          ...newPlan.activityBased[ind.id],
          ...(preset.activityBased as any)[ind.id],
        };
      }
      if (ind.type === 'OUTCOME' && (preset.outcomeBased as any)[ind.id]) {
        newPlan.outcomeBased[ind.id] = {
          ...newPlan.outcomeBased[ind.id],
          ...(preset.outcomeBased as any)[ind.id],
        };
      }
    });

    setPlan(newPlan);
  };

  // ---------- Determine default seat count for preview ----------
  const getDefaultSampleSeats = (): number => {
    if (plan.seatBased.minimumCommitment > 0) {
      return plan.seatBased.minimumCommitment;
    } else if (plan.seatBased.includedUsage > 0) {
      return plan.seatBased.includedUsage;
    }
    return 1;
  };

  // Use the slider value if seat-based is enabled, otherwise use calculated default
  const effectiveSampleSeats = plan.seatBased.enabled ? sampleSeats : 0;

  // ---------- Invoice breakdown calculation ----------
  interface InvoiceBreakdown {
    basePrice: number;
    setupFee: number;
    platformFee: number;
    seatCharge: number;
    indicatorCharges: Record<string, number>;
    total: number;
  }

  const calculateInvoiceBreakdown = (seats: number = effectiveSampleSeats): InvoiceBreakdown => {
    let basePrice = plan.basePrice / 100;
    let setupFee = plan.setupFee.enabled ? plan.setupFee.price / 100 : 0;
    let platformFee = plan.platformFee.enabled ? plan.platformFee.price / 100 : 0;
    let seatCharge = 0;

    if (plan.seatBased.enabled) {
      const chargeableSeats = Math.max(seats, plan.seatBased.minimumCommitment);
      const included = plan.seatBased.includedUsage;
      const extra = Math.max(0, chargeableSeats - included);
      seatCharge = (extra * plan.seatBased.price) / 100;
    }

    const sampleUsage: Record<string, number> = {
      "1770918079308": 150, // message-sent
      "1770960227498": 20,  // article-generated
      "1770967230303": 50,  // voice-generated (minutes)
    };

    const indicatorCharges: Record<string, number> = {};

    agent.indicators.forEach((ind) => {
      const type = ind.type === 'ACTIVITY' ? 'activityBased' : 'outcomeBased';
      const cfg = plan[type][ind.id];
      if (!cfg?.enabled) return;

      let units = sampleUsage[ind.id] || 0;
      
      // Apply rounding for per-minute indicators
      let billingUnits = units;
      if (ind.perMinuteEnabled) {
        if (cfg.rounding === 'ceil') {
          billingUnits = Math.ceil(units);
        } else if (cfg.rounding === 'floor') {
          billingUnits = Math.floor(units);
        }
      } else {
        billingUnits = units * ind.humanValueEquivalent;
      }

      const included = cfg.includedUsage || 0;
      const overage = Math.max(0, billingUnits - included);

      let indicatorCost = 0;
      if (cfg.billingType === 'FLAT') {
        indicatorCost = overage * (cfg.price || 0) / 100;
      } else if (cfg.billingType === 'VOLUME' || cfg.billingType === 'GRADUATED') {
        const tiers = cfg.tiers || [];
        let remaining = overage;
        for (const tier of tiers.sort((a: Tier, b: Tier) => a.from - b.from)) {
          const tierUnits = tier.to === 0
            ? remaining
            : Math.min(remaining, tier.to - tier.from + 1);
          indicatorCost += (tierUnits * (tier.price || 0)) / 100;
          remaining -= tierUnits;
          if (remaining <= 0) break;
        }
      }
      
      if (indicatorCost > 0) {
        indicatorCharges[ind.name] = indicatorCost;
      }
    });

    const total = basePrice + setupFee + platformFee + seatCharge + Object.values(indicatorCharges).reduce((a, b) => a + b, 0);

    return {
      basePrice,
      setupFee,
      platformFee,
      seatCharge,
      indicatorCharges,
      total,
    };
  };

  const calculateInvoice = (seats: number = effectiveSampleSeats): string => {
    const breakdown = calculateInvoiceBreakdown(seats);
    return breakdown.total.toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Generate ID if new
    const planToSave = {
      ...plan,
      id: plan.id || `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      updatedAt: new Date().toISOString(),
      createdAt: plan.createdAt || new Date().toISOString(),
    };

    // 🆕 Validate uniqueness
    const error = validatePlan(planToSave, agentId);
    if (error) {
      alert(error);
      setIsSubmitting(false);
      return;
    }

    // Save to localStorage
    savePlan(planToSave);
    
    // Small delay to show saving state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Redirect back to plans list
    router.push(`/agents/${agentId}/plans`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/agents/${agentId}/plans`}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {plan.id ? 'Edit plan' : 'Create new plan'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">{agent.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">
                {agent.agentType === 'voice' && (
                  <span className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold uppercase tracking-wide">
                    Voice · per-minute billing
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Presets - only show for new plans */}
        {!plan.id && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Start Templates</h2>
            <div className="flex flex-wrap gap-3">
              {Object.keys(PRESETS).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset as keyof typeof PRESETS)}
                  className="px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-700 rounded-lg border border-emerald-200 transition duration-200"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main form - grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Basic Info & Fees & Seats */}
          <div className="lg:col-span-2 space-y-8">
            {/* 1️⃣ Plan Identity */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Plan Identity</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Plan Name
                    </label>
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => {
                        updatePlan('name', e.target.value);
                        const slug = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-|-$/g, '');
                        updatePlan('slug', slug);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                      placeholder="e.g., Growth Plan"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Slug
                    </label>
                    <input
                      type="text"
                      value={plan.slug}
                      onChange={(e) => updatePlan('slug', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition bg-gray-50"
                      placeholder="growth-plan"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-2">URL-friendly identifier</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={plan.description}
                    onChange={(e) => updatePlan('description', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                    placeholder="Brief description of this plan"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Billing Frequency
                    </label>
                    <select
                      value={plan.billingFrequency}
                      onChange={(e) => updatePlan('billingFrequency', e.target.value as BillingFrequency)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                    >
                      <option>Monthly</option>
                      <option>Quarterly</option>
                      <option>Annual</option>
                      <option>OneTime</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Base Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500 font-medium">₹</span>
                      <input
                        type="number"
                        value={plan.basePrice / 100 || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || val === '0') {
                            updatePlan('basePrice', 0);
                          } else {
                            updatePlan('basePrice', Number(val) * 100);
                          }
                        }}
                        className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2️⃣ Fees & Seats */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Fees & Seats</h2>
              <div className="space-y-4">
                {/* Setup Fee */}
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-2 min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={plan.setupFee.enabled}
                      onChange={(e) => updateSetupFee({ enabled: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    <span className="text-sm font-medium">Setup Fee</span>
                  </label>
                  {plan.setupFee.enabled && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">₹</span>
                      <input
                        type="number"
                        value={plan.setupFee.price / 100 || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || val === '0') {
                            updateSetupFee({ price: 0 });
                          } else {
                            updateSetupFee({ price: Number(val) * 100 });
                          }
                        }}
                        className="w-24 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  )}
                </div>

                {/* Platform Fee */}
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-2 min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={plan.platformFee.enabled}
                      onChange={(e) => updatePlatformFee({ enabled: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    <span className="text-sm font-medium">Platform Fee</span>
                  </label>
                  {plan.platformFee.enabled && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">₹</span>
                        <input
                          type="number"
                          value={plan.platformFee.price / 100 || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || val === '0') {
                              updatePlatformFee({ price: 0 });
                            } else {
                              updatePlatformFee({ price: Number(val) * 100 });
                            }
                          }}
                          className="w-24 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <select
                        value={plan.platformFee.billingFrequency}
                        onChange={(e) => updatePlatformFee({ billingFrequency: e.target.value as BillingFrequency })}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
                      >
                        <option>Monthly</option>
                        <option>Quarterly</option>
                        <option>Annual</option>
                      </select>
                    </>
                  )}
                </div>

                {/* Seat Based */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={plan.seatBased.enabled}
                      onChange={(e) => updateSeatBased({ enabled: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    <span className="text-sm font-medium">Enable Seat-based pricing</span>
                  </label>
                  {plan.seatBased.enabled && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Price per seat (₹)</label>
                        <input
                          type="number"
                          value={plan.seatBased.price / 100 || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || val === '0') {
                              updateSeatBased({ price: 0 });
                            } else {
                              updateSeatBased({ price: Number(val) * 100 });
                            }
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Included seats</label>
                        <input
                          type="number"
                          value={plan.seatBased.includedUsage || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || val === '0') {
                              updateSeatBased({ includedUsage: 0 });
                            } else {
                              updateSeatBased({ includedUsage: Number(val) });
                            }
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Minimum commitment (seats)</label>
                        <input
                          type="number"
                          value={plan.seatBased.minimumCommitment || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || val === '0') {
                              updateSeatBased({ minimumCommitment: 0 });
                            } else {
                              updateSeatBased({ minimumCommitment: Number(val) });
                            }
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Billing frequency</label>
                        <select
                          value={plan.seatBased.billingFrequency}
                          onChange={(e) => updateSeatBased({ billingFrequency: e.target.value as BillingFrequency })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                        >
                          <option>Monthly</option>
                          <option>Quarterly</option>
                          <option>Annual</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Preview Panels */}
          <div className="space-y-8">
            {/* Invoice Preview */}
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl shadow-sm p-8 border border-emerald-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-emerald-900">Invoice Preview</h3>
                <select
                  value={plan.currency}
                  onChange={(e) => updatePlan('currency', e.target.value)}
                  className="text-xs border border-emerald-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="INR">₹ INR</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                  <option value="GBP">£ GBP</option>
                  <option value="AUD">A$ AUD</option>
                  <option value="CAD">C$ CAD</option>
                </select>
              </div>
              
              {/* Seat Slider */}
              {plan.seatBased.enabled && (
                <div className="mb-6 pb-6 border-b border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-emerald-900">
                      Sample Seats
                    </label>
                    <span className="text-sm font-bold text-emerald-700">{effectiveSampleSeats}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sampleSeats}
                    onChange={(e) => setSampleSeats(Number(e.target.value))}
                    className="w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="flex justify-between text-xs text-emerald-600 mt-1">
                    <span>0</span>
                    <span>100</span>
                  </div>
                </div>
              )}

              <p className="text-xs text-emerald-700 mb-5">
                {agent.agentType === 'voice' 
                  ? `Based on sample: ${effectiveSampleSeats} seat${effectiveSampleSeats !== 1 ? 's' : ''}, 50 voice minutes`
                  : `Based on sample: ${effectiveSampleSeats} seat${effectiveSampleSeats !== 1 ? 's' : ''}, 150 messages, 20 articles`
                }
              </p>
              
              <div className="text-4xl font-bold text-emerald-900">
                {formatPrice(calculateInvoiceBreakdown().total * 100, plan.currency)}
                <span className="text-base font-normal text-emerald-600 ml-2">
                  /{plan.billingFrequency.toLowerCase()}
                </span>
              </div>
              
              <div className="mt-6 pt-6 border-t border-emerald-200">
                <h4 className="text-xs font-bold text-emerald-900 mb-4 uppercase tracking-wide">Breakdown</h4>
                <div className="space-y-3 text-xs text-emerald-800">
                  {(() => {
                    const breakdown = calculateInvoiceBreakdown();
                    return (
                      <>
                        {breakdown.basePrice > 0 && (
                          <div className="flex justify-between">
                            <span>Base price:</span>
                            <span className="font-medium">{formatPrice(breakdown.basePrice * 100, plan.currency)}</span>
                          </div>
                        )}
                        {breakdown.setupFee > 0 && (
                          <div className="flex justify-between">
                            <span>Setup fee:</span>
                            <span className="font-medium">{formatPrice(breakdown.setupFee * 100, plan.currency)}</span>
                          </div>
                        )}
                        {breakdown.platformFee > 0 && (
                          <div className="flex justify-between">
                            <span>Platform fee:</span>
                            <span className="font-medium">{formatPrice(breakdown.platformFee * 100, plan.currency)}</span>
                          </div>
                        )}
                        {plan.seatBased.enabled && (
                          <div className="flex justify-between">
                            <span>
                              Seats ({Math.max(effectiveSampleSeats, plan.seatBased.minimumCommitment)} @ {formatPrice(plan.seatBased.price, plan.currency)}/seat):
                            </span>
                            <span className="font-medium">{formatPrice(breakdown.seatCharge * 100, plan.currency)}</span>
                          </div>
                        )}
                        {Object.entries(breakdown.indicatorCharges).map(([name, charge]) => (
                          <div key={name} className="flex justify-between">
                            <span>{name}:</span>
                            <span className="font-medium">{formatPrice(charge * 100, plan.currency)}</span>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                  {Object.values(calculateInvoiceBreakdown().indicatorCharges).length === 0 && calculateInvoiceBreakdown().basePrice === 0 && calculateInvoiceBreakdown().setupFee === 0 && calculateInvoiceBreakdown().platformFee === 0 && calculateInvoiceBreakdown().seatCharge === 0 && (
                    <div className="text-emerald-600 italic">No charges configured</div>
                  )}
                </div>
              </div>
            </div>

            {/* Subscription Preview */}
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
              <h3 className="text-base font-bold text-gray-900 mb-4">Subscription Preview</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <div className="flex justify-between">
                  <span>Customer subscribes to:</span>
                  <span className="font-medium">{plan.name || 'Unnamed Plan'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Billing cycle:</span>
                  <span className="font-medium">{plan.billingFrequency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Invoice generated:</span>
                  <span className="font-medium">Every {plan.billingFrequency}</span>
                </div>
                <div className="border-t pt-2 mt-2 text-xs text-gray-400">
                  Usage is measured per billing cycle. Overage charges apply after included units.
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3.5 px-4 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? 'Saving...' : plan.id ? 'Update Plan' : 'Create Plan'}
              </button>
              <Link
                href={`/agents/${agentId}/plans`}
                className="block text-center mt-3 text-sm text-gray-600 hover:text-gray-900 py-2.5 font-medium"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>

        {/* Usage-Based Pricing Section - Full Width */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Usage-Based Pricing</h2>
          <div className="space-y-6">
            {agent.indicators.map((indicator) => {
              const type = indicator.type === 'ACTIVITY' ? 'activityBased' : 'outcomeBased';
              const config = plan[type][indicator.id] || {
                enabled: false,
                billingType: 'FLAT',
                price: 0,
                billingFrequency: 'Monthly',
                includedUsage: 0,
                tiers: [],
                rounding: 'ceil',
              };

              return (
                <div key={indicator.id} className="border border-gray-200 rounded-lg p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="font-medium text-gray-900">{indicator.name}</span>
                      <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                        {indicator.type}
                      </span>
                      {indicator.perMinuteEnabled && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          per minute
                        </span>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        1 {indicator.perMinuteEnabled ? 'minute' : 'event'} = {indicator.humanValueEquivalent} billing unit
                        {indicator.perMinuteEnabled ? ' (billed per minute)' : ''}
                      </p>
                    </div>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) =>
                          updateIndicator(type, indicator.id, { enabled: e.target.checked })
                        }
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-sm font-medium">Enabled</span>
                    </label>
                  </div>

                  {config.enabled && (
                    <div className="space-y-4">
                      {/* Billing Frequency & Type */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Billing Frequency
                          </label>
                          <select
                            value={config.billingFrequency}
                            onChange={(e) =>
                              updateIndicator(type, indicator.id, {
                                billingFrequency: e.target.value as BillingFrequency,
                              })
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                          >
                            <option>Monthly</option>
                            <option>Quarterly</option>
                            <option>Annual</option>
                            <option>OneTime</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Billing Type
                          </label>
                          <div className="flex gap-4 pt-2">
                            {(['FLAT', 'VOLUME', 'GRADUATED'] as const).map((bt) => (
                              <label key={bt} className="flex items-center gap-1.5 text-sm">
                                <input
                                  type="radio"
                                  name={`billing-type-${indicator.id}`}
                                  value={bt}
                                  checked={config.billingType === bt}
                                  onChange={(e) =>
                                    updateIndicator(type, indicator.id, {
                                      billingType: e.target.value as BillingType,
                                    })
                                  }
                                  className="accent-indigo-600"
                                />
                                {bt}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Price & Commitments */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price (₹/{indicator.perMinuteEnabled ? 'min' : 'unit'})
                          </label>
                          <input
                            type="number"
                            value={config.price || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || val === '0') {
                                updateIndicator(type, indicator.id, { price: 0 });
                              } else {
                                updateIndicator(type, indicator.id, { price: Number(val) });
                              }
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Min Commitment ({indicator.perMinuteEnabled ? 'mins' : 'units'})
                          </label>
                          <input
                            type="number"
                            value={config.minimumCommitment ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || val === '0') {
                                updateIndicator(type, indicator.id, { minimumCommitment: 0 });
                              } else {
                                updateIndicator(type, indicator.id, { minimumCommitment: Number(val) });
                              }
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Included ({indicator.perMinuteEnabled ? 'mins' : 'units'})
                          </label>
                          <input
                            type="number"
                            value={config.includedUsage || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || val === '0') {
                                updateIndicator(type, indicator.id, { includedUsage: 0 });
                              } else {
                                updateIndicator(type, indicator.id, { includedUsage: Number(val) });
                              }
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                            min="0"
                          />
                        </div>
                      </div>

                      {/* 🆕 Rounding (for per-minute) */}
                      {indicator.perMinuteEnabled && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rounding Rule
                          </label>
                          <select
                            value={config.rounding || 'ceil'}
                            onChange={(e) =>
                              updateIndicator(type, indicator.id, {
                                rounding: e.target.value as 'ceil' | 'floor' | 'exact',
                              })
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                          >
                            <option value="ceil">Round up to nearest minute</option>
                            <option value="floor">Round down to nearest minute</option>
                            <option value="exact">Bill per second (exact)</option>
                          </select>
                        </div>
                      )}

                      {/* Tiers */}
                      {(config.billingType === 'VOLUME' || config.billingType === 'GRADUATED') && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">
                              Tiers ({indicator.perMinuteEnabled ? 'minutes' : 'units'})
                            </span>
                            <button
                              type="button"
                              onClick={() => addTier(type, indicator.id)}
                              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add tier
                            </button>
                          </div>
                          <div className="space-y-2">
                            {config.tiers?.map((tier: Tier, idx: number) => (
                              <div key={tier.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                <span className="text-gray-500 text-sm w-6">{idx + 1}.</span>
                                <input
                                  type="number"
                                  value={tier.from || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || val === '0') {
                                      updateTier(type, indicator.id, tier.id, 'from', 0);
                                    } else {
                                      updateTier(type, indicator.id, tier.id, 'from', Number(val));
                                    }
                                  }}
                                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                                  placeholder="From"
                                  min="0"
                                />
                                <span>–</span>
                                <input
                                  type="number"
                                  value={tier.to === 0 ? '' : tier.to || ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                    updateTier(type, indicator.id, tier.id, 'to', val);
                                  }}
                                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                                  placeholder="To"
                                  min="0"
                                />
                                <span className="text-sm">
                                  {indicator.perMinuteEnabled ? 'min @ ₹' : 'units @ ₹'}
                                </span>
                                <input
                                  type="number"
                                  value={tier.price || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || val === '0') {
                                      updateTier(type, indicator.id, tier.id, 'price', 0);
                                    } else {
                                      updateTier(type, indicator.id, tier.id, 'price', Number(val));
                                    }
                                  }}
                                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                                  step="0.01"
                                  min="0"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeTier(type, indicator.id, tier.id)}
                                  className="text-red-500 hover:text-red-700 ml-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {config.billingType === 'VOLUME'
                              ? `All ${indicator.perMinuteEnabled ? 'minutes' : 'units'} in a tier are charged at that tier’s rate.`
                              : `Only ${indicator.perMinuteEnabled ? 'minutes' : 'units'} above the tier threshold are charged at the next rate.`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 4️⃣ Limits & Enforcement */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Limits & Enforcement</h2>
          <div className="grid grid-cols-2 gap-6 max-w-2xl">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Max tokens per month
              </label>
              <input
                type="number"
                value={plan.hardLimits.tokensPerMonth || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || val === '0') {
                    setPlan((prev: Plan) => ({
                      ...prev,
                      hardLimits: { ...prev.hardLimits, tokensPerMonth: 0 },
                      updatedAt: new Date().toISOString()
                    }))
                  } else {
                    setPlan((prev: Plan) => ({
                      ...prev,
                      hardLimits: { ...prev.hardLimits, tokensPerMonth: Number(val) },
                      updatedAt: new Date().toISOString()
                    }))
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                placeholder="e.g., 500000"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Max API calls per month
              </label>
              <input
                type="number"
                value={plan.hardLimits.apiCallsPerMonth || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || val === '0') {
                    setPlan((prev: Plan) => ({
                      ...prev,
                      hardLimits: { ...prev.hardLimits, apiCallsPerMonth: 0 },
                      updatedAt: new Date().toISOString()
                    }))
                  } else {
                    setPlan((prev: Plan) => ({
                      ...prev,
                      hardLimits: { ...prev.hardLimits, apiCallsPerMonth: Number(val) },
                      updatedAt: new Date().toISOString()
                    }))
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                placeholder="e.g., 5000"
                min="0"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function CreatePlanPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreatePlanContent />
    </Suspense>
  );
}
