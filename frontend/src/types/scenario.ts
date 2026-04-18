// types/scenario.ts

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  form_data: {
    enterprise_type: string;
    region: string;
    host_count: number;
  };
}