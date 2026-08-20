export type TemplateMeta = {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
  };
};

export const templateMetas: TemplateMeta[] = [
  {
    id: "template-1",
    name: "Business OS",
    colors: {
      primary: "47 107 255",
      secondary: "34 199 201",
      background: "244 248 252",
    },
  },
  {
    id: "template-2",
    name: "Linear",
    colors: {
      primary: "94 106 210",
      secondary: "130 143 255",
      background: "15 16 17",
    },
  },
];

export default templateMetas;
