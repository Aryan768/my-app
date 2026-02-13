// plan-storage.ts
export interface Tier {
    id: string;
    from: number;
    to: number;
    units: number;
    price: number;
}

export interface IndicatorPricing {
    enabled: boolean;
    billingType?: 'FLAT' | 'VOLUME' | 'GRADUATED';
    price: number;
    billingFrequency: 'Monthly' | 'Quarterly' | 'Annual' | 'OneTime';
    minimumCommitment?: number;
    includedUsage: number;
    tiers?: Tier[];
    rounding?: 'ceil' | 'floor' | 'exact';   // 🆕 for per-minute indicators
}

export interface SeatPricing {
    enabled: boolean;
    billingType: 'FLAT' | 'VOLUME' | 'GRADUATED';
    price: number;
    billingFrequency: 'Monthly' | 'Quarterly' | 'Annual' | 'OneTime';
    minimumCommitment: number;
    includedUsage: number;
}

export interface Fee {
    enabled: boolean;
    price: number;
    billingFrequency?: 'Monthly' | 'Quarterly' | 'Annual' | 'OneTime';
}

export interface Plan {
    id: string;
    agentId: string;
    name: string;
    slug: string;
    description: string;
    billingFrequency: 'Monthly' | 'Quarterly' | 'Annual' | 'OneTime';
    currency: string;
    basePrice: number;
    setupFee: Fee;
    platformFee: Fee;
    seatBased: SeatPricing;
    activityBased: Record<string, IndicatorPricing>;
    outcomeBased: Record<string, IndicatorPricing>;
    hardLimits: {
        tokensPerMonth: number;
        apiCallsPerMonth: number;
    };
    createdAt: string;
    updatedAt: string;
}

export const STORAGE_KEY = 'agent_plans';

// Get all plans from localStorage
export const getPlans = (): Plan[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
};

// Save a plan (create or update)
export const savePlan = (plan: Plan): Plan => {
    const plans = getPlans();
    const existingIndex = plans.findIndex(p => p.id === plan.id);

    if (existingIndex >= 0) {
        plans[existingIndex] = plan;
    } else {
        plans.push(plan);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    return plan;
};

// Delete a plan
export const deletePlan = (planId: string): void => {
    const plans = getPlans().filter(p => p.id !== planId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
};

// Get plans for a specific agent
export const getPlansByAgent = (agentId: string): Plan[] => {
    return getPlans().filter(p => p.agentId === agentId);
};

// Get a single plan by ID
export const getPlan = (planId: string): Plan | undefined => {
    return getPlans().find(p => p.id === planId);
};

// Seed some initial plans (optional – call once to have demo data)
export const seedInitialPlans = () => {
    const existing = getPlans();
    if (existing.length > 0) return;

    const initialPlans: Plan[] = [
        {
            id: 'plan_starter_1',
            agentId: 'kanu',
            name: 'Starter',
            slug: 'starter',
            description: 'For small teams getting started',
            billingFrequency: 'Monthly',
            currency: 'INR',
            basePrice: 0,
            setupFee: { enabled: false, price: 0 },
            platformFee: { enabled: false, price: 0 },
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
            hardLimits: { tokensPerMonth: 100000, apiCallsPerMonth: 1000 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            id: 'plan_growth_1',
            agentId: 'kanu',
            name: 'Growth',
            slug: 'growth',
            description: 'For scaling AI agents',
            billingFrequency: 'Monthly',
            currency: 'INR',
            basePrice: 49900,
            setupFee: { enabled: true, price: 50000 },
            platformFee: { enabled: true, price: 1500, billingFrequency: 'Monthly' },
            seatBased: {
                enabled: true,
                billingType: 'FLAT',
                price: 1000,
                billingFrequency: 'Monthly',
                minimumCommitment: 12,
                includedUsage: 3,
            },
            activityBased: {
                "1770918079308": {
                    enabled: true,
                    billingType: 'FLAT',
                    price: 2,
                    billingFrequency: 'Monthly',
                    includedUsage: 3,
                },
            },
            outcomeBased: {
                "1770960227498": {
                    enabled: true,
                    billingType: 'FLAT',
                    price: 2,
                    billingFrequency: 'Monthly',
                    includedUsage: 2,
                },
            },
            hardLimits: { tokensPerMonth: 500000, apiCallsPerMonth: 5000 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            id: 'plan_voice_1',
            agentId: 'manu',
            name: 'Voice PayGo',
            slug: 'voice-paygo',
            description: 'Pay as you go for voice generation',
            billingFrequency: 'Quarterly',
            currency: 'INR',
            basePrice: 0,
            setupFee: { enabled: false, price: 0 },
            platformFee: { enabled: false, price: 0 },
            seatBased: {
                enabled: false,
                billingType: 'FLAT',
                price: 0,
                billingFrequency: 'Monthly',
                minimumCommitment: 0,
                includedUsage: 0,
            },
            activityBased: {},
            outcomeBased: {
                "1770967230303": {
                    enabled: true,
                    billingType: 'VOLUME',
                    price: 5,
                    billingFrequency: 'Quarterly',
                    includedUsage: 0,
                    rounding: 'ceil', // default rounding
                    tiers: [
                        { id: 't1', from: 1, to: 5, units: 0, price: 10 },
                        { id: 't2', from: 6, to: 10, units: 0, price: 8 },
                        { id: 't3', from: 11, to: 0, units: 0, price: 5 },
                    ],
                },
            },
            hardLimits: { tokensPerMonth: 1000000, apiCallsPerMonth: 10000 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
    ];

    initialPlans.forEach(plan => savePlan(plan));
};