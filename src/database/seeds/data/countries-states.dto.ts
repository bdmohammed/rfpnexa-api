// import type { StateType } from '@/types/enums';

export interface StateSeedInput {
  code: string;
  name: string;
  // type: StateType;
}

export interface CountrySeedInput {
  code: string;
  name: string;
  states: readonly StateSeedInput[];
}
