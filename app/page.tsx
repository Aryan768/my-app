"use client";

import React, { useState } from 'react';

// ------------------------------------------------------------
//  TYPES (exact match to your JSON + Plan structure)
// ------------------------------------------------------------
type BillingType = 'FLAT' | 'VOLUME' | 'GRADUATED';
type BillingFrequency = 'Monthly' | 'Quarterly' | 'Annual' | 'OneTime';

interface Tier {
  id: string;
  from: number;
  to: number;      // 0 = unlimited
  units: number;
  price: number;
}

interface Indicator {
  id: string;
  name: string;
  type: 'ACTIVITY' | 'OUTCOME';
  humanValueEquivalent: number;
  perMinuteEnabled: boolean;
}

interface IndicatorPricing {
  enabled: boolean;
  billingType?: BillingType;
  price: number;               // per unit (or fallback for tiers)
  billingFrequency: BillingFrequency;
  minimumCommitment?: number;
  includedUsage: number;
  tiers?: Tier[];
}

interface SeatPricing {
  enabled: boolean;
  billingType: BillingType;
  price: number;              // per seat
  billingFrequency: BillingFrequency;
  minimumCommitment: number;
  includedUsage: number;
}

interface Fee {
  enabled: boolean;
  price: number;
  billingFrequency?: BillingFrequency;
}

interface Plan {
  // Core
  name: string;
  slug: string;
  description: string;
  billingFrequency: BillingFrequency;
  currency: string;
  basePrice: number;          // in smallest currency unit (paise / cents)

  // Fees
  setupFee: Fee;
  platformFee: Fee;

  // Seats
  seatBased: SeatPricing;

  // Per‑indicator pricing
  activityBased: Record<string, IndicatorPricing>;
  outcomeBased: Record<string, IndicatorPricing>;

  // Limits
  hardLimits: {
    tokensPerMonth: number;
    apiCallsPerMonth: number;
  };
}

interface Agent {
  id: string;
  name: string;
  description: string;
  externalId: string;
  status: string;
  agentType: string;
  indicators: Indicator[];
}

// ------------------------------------------------------------
//  STATIC DATA – your exact agents
// ------------------------------------------------------------
const agents: Agent[] = [
  {
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
  {
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
];

// ------------------------------------------------------------
//  PRESETS for quick filling
// ------------------------------------------------------------
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

// ------------------------------------------------------------
//  HELPER: empty plan for a given agent
// ------------------------------------------------------------
const createEmptyPlan = (agent: Agent): Plan => ({
  name: "",
  slug: "",
  description: "",
  billingFrequency: "Monthly",
  currency: "INR",
  basePrice: 0,
  setupFee: { enabled: false, price: 0 },
  platformFee: { enabled: false, price: 0, billingFrequency: "Monthly" },
  seatBased: {
    enabled: false,
    billingType: "FLAT",
    price: 0,
    billingFrequency: "Monthly",
    minimumCommitment: 0,
    includedUsage: 0,
  },
  activityBased: {},
  outcomeBased: {},
  hardLimits: { tokensPerMonth: 0, apiCallsPerMonth: 0 },
});

// ------------------------------------------------------------
//  MAIN COMPONENT – Create Plan
// ------------------------------------------------------------
export default function CreatePlanPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent>(agents[0]);
  const [plan, setPlan] = useState<Plan>(() => createEmptyPlan(agents[0]));

  // ---------- Agent switching ----------
  const handleAgentChange = (agent: Agent) => {
    setSelectedAgent(agent);
    setPlan(createEmptyPlan(agent));
  };

  // ---------- Generic updaters ----------
  const updatePlan = <K extends keyof Plan>(field: K, value: Plan[K]) => {
    setPlan((prev) => ({ ...prev, [field]: value }));
  };

  const updateSetupFee = (updates: Partial<Fee>) =>
    setPlan((prev) => ({ ...prev, setupFee: { ...prev.setupFee, ...updates } }));

  const updatePlatformFee = (updates: Partial<Fee>) =>
    setPlan((prev) => ({ ...prev, platformFee: { ...prev.platformFee, ...updates } }));

  const updateSeatBased = (updates: Partial<SeatPricing>) =>
    setPlan((prev) => ({ ...prev, seatBased: { ...prev.seatBased, ...updates } }));

  // ---------- Per‑indicator updaters ----------
  const updateIndicator = (
    type: 'activityBased' | 'outcomeBased',
    indicatorId: string,
    updates: Partial<IndicatorPricing>
  ) => {
    setPlan((prev) => {
      const current = prev[type][indicatorId] || {
        enabled: false,
        billingType: 'FLAT',
        price: 0,
        billingFrequency: 'Monthly',
        includedUsage: 0,
        tiers: [],
      };
      return {
        ...prev,
        [type]: {
          ...prev[type],
          [indicatorId]: { ...current, ...updates },
        },
      };
    });
  };

  // ---------- Tier management ----------
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
    const updatedTiers = (current.tiers || []).map((t) =>
      t.id === tierId ? { ...t, [field]: value } : t
    );
    updateIndicator(type, indicatorId, { tiers: updatedTiers });
  };

  const removeTier = (type: 'activityBased' | 'outcomeBased', indicatorId: string, tierId: string) => {
    const current = plan[type][indicatorId];
    if (!current) return;
    updateIndicator(type, indicatorId, {
      tiers: (current.tiers || []).filter((t) => t.id !== tierId),
    });
  };

  // ---------- Apply preset ----------
  const applyPreset = (presetName: keyof typeof PRESETS) => {
    const preset = PRESETS[presetName];
    if (!preset) return;

    // Start with empty plan for the current agent
    const newPlan = createEmptyPlan(selectedAgent);

    // Override with preset values
    newPlan.name = preset.name;
    newPlan.basePrice = preset.basePrice;
    newPlan.seatBased = { ...newPlan.seatBased, ...preset.seatBased };
    newPlan.hardLimits = { ...newPlan.hardLimits, ...preset.hardLimits };

    // Merge indicator pricing (only if indicator exists in agent)
    selectedAgent.indicators.forEach((ind) => {
      if (ind.type === 'ACTIVITY' && preset.activityBased[ind.id]) {
        newPlan.activityBased[ind.id] = {
          ...newPlan.activityBased[ind.id],
          ...preset.activityBased[ind.id],
        };
      }
      if (ind.type === 'OUTCOME' && preset.outcomeBased[ind.id]) {
        newPlan.outcomeBased[ind.id] = {
          ...newPlan.outcomeBased[ind.id],
          ...preset.outcomeBased[ind.id],
        };
      }
    });

    setPlan(newPlan);
  };

  // ---------- Invoice preview (sample usage) ----------
  const calculateInvoice = (): string => {
    let total = plan.basePrice / 100; // convert to rupees

    // Setup fee
    if (plan.setupFee.enabled) total += plan.setupFee.price / 100;
    // Platform fee (monthly)
    if (plan.platformFee.enabled) total += plan.platformFee.price / 100;

    // Seat charges (sample: 5 seats)
    if (plan.seatBased.enabled) {
      const seats = 5;
      const included = plan.seatBased.includedUsage;
      const extra = Math.max(0, seats - included);
      total += (extra * plan.seatBased.price) / 100;
    }

    // Sample usage per indicator
    const sampleUsage: Record<string, number> = {
      "1770918079308": 150, // message-sent
      "1770960227498": 20,  // article-generated (40 units after *2)
      "1770967230303": 50,  // voice minutes
    };

    selectedAgent.indicators.forEach((ind) => {
      const type = ind.type === 'ACTIVITY' ? 'activityBased' : 'outcomeBased';
      const cfg = plan[type][ind.id];
      if (!cfg?.enabled) return;

      let units = sampleUsage[ind.id] || 0;
      // Apply humanValueEquivalent (e.g., article-generated = 2 units per event)
      let billingUnits = units * ind.humanValueEquivalent;
      // If per-minute, we already have minutes, no need to multiply further
      if (ind.perMinuteEnabled) billingUnits = units; // sample is already in minutes

      const included = cfg.includedUsage || 0;
      const overage = Math.max(0, billingUnits - included);

      if (cfg.billingType === 'FLAT') {
        total += overage * (cfg.price || 0);
      } else if (cfg.billingType === 'VOLUME' || cfg.billingType === 'GRADUATED') {
        const tiers = cfg.tiers || [];
        let remaining = overage;
        let tierCost = 0;
        for (const tier of tiers.sort((a, b) => a.from - b.from)) {
          const tierUnits = tier.to === 0
            ? remaining
            : Math.min(remaining, tier.to - tier.from + 1);
          tierCost += tierUnits * (tier.price || 0);
          remaining -= tierUnits;
          if (remaining <= 0) break;
        }
        total += tierCost;
      }
    });

    return total.toFixed(2);
  };

  // ---------- Save handler (mock) ----------
  const handleSave = () => {
    console.log('Plan saved:', plan);
    alert('Plan created! Check console for details.');
  };

  // ------------------------------------------------------------
  //  RENDER
  // ------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create Pricing Plan</h1>
          <p className="text-gray-600 mt-1">Define a new plan for an existing agent.</p>
        </div>

        {/* Agent Selector */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">1. Select Agent</h2>
          <div className="flex flex-wrap gap-3">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleAgentChange(agent)}
                className={`px-5 py-2.5 rounded-lg border transition ${
                  selectedAgent.id === agent.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {agent.name} <span className="text-xs opacity-80">({agent.agentType})</span>
              </button>
            ))}
          </div>
          {selectedAgent && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm font-medium text-gray-700">Agent:</span>
                <span className="text-sm text-gray-900">{selectedAgent.name}</span>
                <span className="text-xs bg-gray-200 px-2 py-1 rounded">ID: {selectedAgent.externalId}</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{selectedAgent.status}</span>
              </div>
            </div>
          )}
        </div>

        {/* Presets */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">2. Start from a preset</h2>
          <div className="flex flex-wrap gap-3">
            {Object.keys(PRESETS).map((preset) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset as keyof typeof PRESETS)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-800"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">3. Plan Configuration</h2>

          {/* ---------- BASIC INFO ---------- */}
          <section className="mb-8">
            <h3 className="text-md font-medium text-gray-800 mb-4 flex items-center">
              <span className="bg-indigo-100 text-indigo-800 w-6 h-6 rounded-full inline-flex items-center justify-center text-sm mr-2">1</span>
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                <input
                  type="text"
                  value={plan.name}
                  onChange={(e) => updatePlan('name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Growth"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={plan.slug}
                  onChange={(e) => updatePlan('slug', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  placeholder="growth"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={plan.description}
                  onChange={(e) => updatePlan('description', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ideal for scaling teams"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Frequency</label>
                <select
                  value={plan.billingFrequency}
                  onChange={(e) => updatePlan('billingFrequency', e.target.value as BillingFrequency)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option>Monthly</option>
                  <option>Quarterly</option>
                  <option>Annual</option>
                  <option>OneTime</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={plan.currency}
                  onChange={(e) => updatePlan('currency', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option>INR</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (₹)</label>
                <input
                  type="number"
                  value={plan.basePrice / 100}
                  onChange={(e) => updatePlan('basePrice', Number(e.target.value) * 100)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Recurring charge per billing cycle</p>
              </div>
            </div>
          </section>

          {/* ---------- FEES & SEATS ---------- */}
          <section className="mb-8">
            <h3 className="text-md font-medium text-gray-800 mb-4 flex items-center">
              <span className="bg-indigo-100 text-indigo-800 w-6 h-6 rounded-full inline-flex items-center justify-center text-sm mr-2">2</span>
              Fees & Seats
            </h3>
            <div className="space-y-5">
              {/* Setup Fee */}
              <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 w-36">
                  <input
                    type="checkbox"
                    checked={plan.setupFee.enabled}
                    onChange={(e) => updateSetupFee({ enabled: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Setup Fee
                </label>
                {plan.setupFee.enabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">₹</span>
                    <input
                      type="number"
                      value={plan.setupFee.price / 100}
                      onChange={(e) => updateSetupFee({ price: Number(e.target.value) * 100 })}
                      className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                )}
              </div>

              {/* Platform Fee */}
              <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 w-36">
                  <input
                    type="checkbox"
                    checked={plan.platformFee.enabled}
                    onChange={(e) => updatePlatformFee({ enabled: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Platform Fee
                </label>
                {plan.platformFee.enabled && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">₹</span>
                      <input
                        type="number"
                        value={plan.platformFee.price / 100}
                        onChange={(e) => updatePlatformFee({ price: Number(e.target.value) * 100 })}
                        className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <select
                      value={plan.platformFee.billingFrequency}
                      onChange={(e) => updatePlatformFee({ billingFrequency: e.target.value as BillingFrequency })}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500"
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
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <input
                    type="checkbox"
                    checked={plan.seatBased.enabled}
                    onChange={(e) => updateSeatBased({ enabled: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Enable Seat‑based pricing
                </label>
                {plan.seatBased.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Price per seat (₹)</label>
                      <input
                        type="number"
                        value={plan.seatBased.price / 100}
                        onChange={(e) => updateSeatBased({ price: Number(e.target.value) * 100 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Included seats</label>
                      <input
                        type="number"
                        value={plan.seatBased.includedUsage}
                        onChange={(e) => updateSeatBased({ includedUsage: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Minimum commitment</label>
                      <input
                        type="number"
                        value={plan.seatBased.minimumCommitment}
                        onChange={(e) => updateSeatBased({ minimumCommitment: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Billing frequency</label>
                      <select
                        value={plan.seatBased.billingFrequency}
                        onChange={(e) => updateSeatBased({ billingFrequency: e.target.value as BillingFrequency })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500"
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
          </section>

          {/* ---------- USAGE-BASED PRICING (PER INDICATOR) ---------- */}
          <section className="mb-8">
            <h3 className="text-md font-medium text-gray-800 mb-4 flex items-center">
              <span className="bg-indigo-100 text-indigo-800 w-6 h-6 rounded-full inline-flex items-center justify-center text-sm mr-2">3</span>
              Usage‑Based Pricing
            </h3>
            <div className="space-y-6">
              {selectedAgent.indicators.map((indicator) => {
                const type = indicator.type === 'ACTIVITY' ? 'activityBased' : 'outcomeBased';
                const config = plan[type][indicator.id] || {
                  enabled: false,
                  billingType: 'FLAT',
                  price: 0,
                  billingFrequency: 'Monthly',
                  includedUsage: 0,
                  tiers: [],
                };

                return (
                  <div key={indicator.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                    {/* Header with name, badge, and enable toggle */}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <span className="font-semibold text-gray-900">{indicator.name}</span>
                        <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full">
                          {indicator.type}
                        </span>
                        {indicator.perMinuteEnabled && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                            per minute
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          1 event = {indicator.humanValueEquivalent} billing unit
                          {indicator.perMinuteEnabled && ' (converted to minutes)'}
                        </p>
                      </div>
                      <label className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={config.enabled}
                          onChange={(e) =>
                            updateIndicator(type, indicator.id, { enabled: e.target.checked })
                          }
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-gray-700">Enabled</span>
                      </label>
                    </div>

                    {config.enabled && (
                      <div className="space-y-5">
                        {/* Billing Frequency */}
                        <div className="flex flex-wrap items-center gap-4">
                          <span className="text-sm font-medium text-gray-700 w-36">
                            BILLING FREQUENCY
                          </span>
                          <select
                            value={config.billingFrequency}
                            onChange={(e) =>
                              updateIndicator(type, indicator.id, {
                                billingFrequency: e.target.value as BillingFrequency,
                              })
                            }
                            className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500"
                          >
                            <option>Monthly</option>
                            <option>Quarterly</option>
                            <option>Annual</option>
                            <option>OneTime</option>
                          </select>
                        </div>

                        {/* Billing Type - Radio */}
                        <div>
                          <span className="text-sm font-medium text-gray-700 block mb-2">
                            Billing type
                          </span>
                          <div className="flex flex-wrap gap-6">
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

                        {/* Price (always visible) */}
                        <div className="flex flex-wrap items-center gap-4">
                          <span className="text-sm font-medium text-gray-700 w-36">
                            Price (₹)
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">₹</span>
                            <input
                              type="number"
                              value={config.price}
                              onChange={(e) =>
                                updateIndicator(type, indicator.id, {
                                  price: Number(e.target.value),
                                })
                              }
                              className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                              step="0.01"
                              min="0"
                            />
                            <span className="text-xs text-gray-500">per unit</span>
                          </div>
                        </div>

                        {/* Minimum Commitment */}
                        <div className="flex flex-wrap items-center gap-4">
                          <span className="text-sm font-medium text-gray-700 w-36">
                            Minimum commitment (units)
                          </span>
                          <input
                            type="number"
                            value={config.minimumCommitment ?? 0}
                            onChange={(e) =>
                              updateIndicator(type, indicator.id, {
                                minimumCommitment: Number(e.target.value),
                              })
                            }
                            className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                            min="0"
                          />
                        </div>

                        {/* Included Usage */}
                        <div className="flex flex-wrap items-center gap-4">
                          <span className="text-sm font-medium text-gray-700 w-36">
                            Included usage (units)
                          </span>
                          <input
                            type="number"
                            value={config.includedUsage}
                            onChange={(e) =>
                              updateIndicator(type, indicator.id, {
                                includedUsage: Number(e.target.value),
                              })
                            }
                            className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                            min="0"
                          />
                        </div>

                        {/* Tiers (VOLUME / GRADUATED) */}
                        {(config.billingType === 'VOLUME' || config.billingType === 'GRADUATED') && (
                          <div className="mt-4 pl-4 border-l-2 border-indigo-200">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-700">
                                Tiered pricing
                              </span>
                              <button
                                type="button"
                                onClick={() => addTier(type, indicator.id)}
                                className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md hover:bg-indigo-100 transition"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add tier
                              </button>
                            </div>
                            <div className="space-y-2">
                              {config.tiers?.map((tier, idx) => (
                                <div key={tier.id} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded-md">
                                  <span className="text-gray-500 w-5">{idx + 1}.</span>
                                  <input
                                    type="number"
                                    value={tier.from}
                                    onChange={(e) =>
                                      updateTier(type, indicator.id, tier.id, 'from', Number(e.target.value))
                                    }
                                    className="w-16 border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                                    placeholder="From"
                                    min="1"
                                  />
                                  <span>–</span>
                                  <input
                                    type="number"
                                    value={tier.to === 0 ? '' : tier.to}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                                      updateTier(type, indicator.id, tier.id, 'to', val);
                                    }}
                                    className="w-16 border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                                    placeholder="To (0 = ∞)"
                                    min="0"
                                  />
                                  <span>units</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-500">₹</span>
                                    <input
                                      type="number"
                                      value={tier.price}
                                      onChange={(e) =>
                                        updateTier(type, indicator.id, tier.id, 'price', Number(e.target.value))
                                      }
                                      className="w-16 border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                                      placeholder="Price"
                                      step="0.01"
                                      min="0"
                                    />
                                    <span className="text-xs text-gray-500">/unit</span>
                                  </div>
                                  <button
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
                                ? 'All units in a tier are charged at that tier’s rate.'
                                : 'Only units above the tier threshold are charged at the next rate.'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ---------- HARD LIMITS ---------- */}
          <section className="mb-8">
            <h3 className="text-md font-medium text-gray-800 mb-4 flex items-center">
              <span className="bg-indigo-100 text-indigo-800 w-6 h-6 rounded-full inline-flex items-center justify-center text-sm mr-2">4</span>
              Hard Limits
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max tokens per month</label>
                <input
                  type="number"
                  value={plan.hardLimits.tokensPerMonth}
                  onChange={(e) =>
                    setPlan((prev) => ({
                      ...prev,
                      hardLimits: { ...prev.hardLimits, tokensPerMonth: Number(e.target.value) },
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 500000"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max API calls per month</label>
                <input
                  type="number"
                  value={plan.hardLimits.apiCallsPerMonth}
                  onChange={(e) =>
                    setPlan((prev) => ({
                      ...prev,
                      hardLimits: { ...prev.hardLimits, apiCallsPerMonth: Number(e.target.value) },
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 5000"
                  min="0"
                />
              </div>
            </div>
          </section>

          {/* ---------- INVOICE PREVIEW ---------- */}
          <section className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-6">
            <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Invoice Preview (Sample Usage)
            </h4>
            <p className="text-sm text-indigo-700 mb-2">
              Based on: 5 seats, 150 messages, 20 articles, 50 voice minutes
            </p>
            <div className="text-3xl font-bold text-indigo-900">
              ₹{calculateInvoice()}
              <span className="text-base font-normal text-indigo-600 ml-2">
                per {plan.billingFrequency.toLowerCase()}
              </span>
            </div>
          </section>

          {/* ---------- ACTIONS ---------- */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setPlan(createEmptyPlan(selectedAgent))}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm"
            >
              Create Plan
            </button>
          </div>
        </div>

        {/* SDK Info Card */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-md font-semibold text-gray-800 mb-3">🔌 How this connects</h3>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
            {`// SDK usage event
await client.sendUsage(
  '${selectedAgent.externalId}',  // agent external id
  'customer_123',               // customer id
  '${selectedAgent.indicators[0]?.name || 'indicator'}', // indicator name
  {
    serviceProvider: 'openai',
    model: 'gpt-4',
    promptTokens: 100,
    completionTokens: 50
  }
);`}
          </div>
          <p className="mt-3 text-sm text-gray-600">
            The indicator name is matched to the plan’s pricing rules. Overages are calculated based on <span className="font-mono text-xs bg-gray-100 px-1 py-0.5">includedUsage</span> and <span className="font-mono text-xs bg-gray-100 px-1 py-0.5">price</span> (or tiers).
          </p>
        </div>
      </div>
    </div>
  );
}