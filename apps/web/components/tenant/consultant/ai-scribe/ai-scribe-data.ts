export type ScribeCase = {
  id: string;
  clientName: string;
  clientCode: string;
  category: string;
  status: "Open" | "On Hold" | "Closed";
};

export const scribeCases: ScribeCase[] = [
  {
    id: "case-sarah-doe",
    clientName: "Sarah Doe",
    clientCode: "#CAS-000002",
    category: "Financial Advisory",
    status: "Open",
  },
  {
    id: "case-john-doe",
    clientName: "John Doe",
    clientCode: "#CAS-000001",
    category: "Retirement Planning",
    status: "Open",
  },
  {
    id: "case-ramesh-chandra",
    clientName: "Ramesh Chandra",
    clientCode: "#CAS-88219",
    category: "Chronic Care Management",
    status: "On Hold",
  },
  {
    id: "case-priya-sharma",
    clientName: "Priya Sharma",
    clientCode: "#CAS-91844",
    category: "Post-Op Follow-up",
    status: "Open",
  },
  {
    id: "case-ananya-verma",
    clientName: "Ananya Verma",
    clientCode: "#CAS-77301",
    category: "Lab Review",
    status: "Closed",
  },
];
