// types.ts
export type BillingType = 'FLAT' | 'VOLUME' | 'GRADUATED';
export type BillingFrequency = 'Monthly' | 'Quarterly' | 'Annual' | 'OneTime';

export interface Tier {
    id: string;
    from: number;
    to: number;
    units: number;
    price: number;
}

export interface Indicator {
    id: string;
    name: string;
    type: 'ACTIVITY' | 'OUTCOME';
    humanValueEquivalent: number;
    perMinuteEnabled: boolean;
}

export interface IndicatorPricing {
    enabled: boolean;
    billingType?: BillingType;
    price: number;
    billingFrequency: BillingFrequency;
    minimumCommitment?: number;
    includedUsage: number;
    tiers?: Tier[];
}

export interface SeatPricing {
    enabled: boolean;
    billingType: BillingType;
    price: number;
    billingFrequency: BillingFrequency;
    minimumCommitment: number;
    includedUsage: number;
}

export interface Fee {
    enabled: boolean;
    price: number;
    billingFrequency?: BillingFrequency;
}

export interface Plan {
    id: string;
    agentId: string;
    name: string;
    slug: string;
    description: string;
    billingFrequency: BillingFrequency;
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

export interface Agent {
    id: string;
    name: string;
    description: string;
    externalId: string;
    status: string;
    agentType: string;
    indicators: Indicator[];
}