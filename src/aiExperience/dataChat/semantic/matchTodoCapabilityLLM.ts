import { createTodoCapabilityMatcher } from '@mrburdeveloperteam/pet-function/apps/todo';
import { routeTodoCapability } from '../../../services/geminiService';
export type { TodoLLMRouteResult } from '@mrburdeveloperteam/pet-function/apps/todo';
export const matchTodoCapabilityLLM = createTodoCapabilityMatcher(routeTodoCapability);
