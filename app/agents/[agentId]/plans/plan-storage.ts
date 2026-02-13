// plan-storage.ts
// We'll define types in a shared file

import { Plan } from "./types";

export const STORAGE_KEY = 'agent_plans';

export const getPlans = (): Plan[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const savePlan = (plan: Plan) => {
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

export const deletePlan = (planId: string) => {
    const plans = getPlans().filter(p => p.id !== planId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
};

export const getPlansByAgent = (agentId: string): Plan[] => {
    return getPlans().filter(p => p.agentId === agentId);
};

export const getPlan = (planId: string): Plan | undefined => {
    return getPlans().find(p => p.id === planId);
};