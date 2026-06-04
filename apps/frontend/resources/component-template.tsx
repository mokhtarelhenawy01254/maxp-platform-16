import React from "react";

export interface StitchComponentProps {
  title: string;
}

const StitchComponent: React.FC<Readonly<StitchComponentProps>> = ({ title }) => {
  return (
    <section className="w-full">
      <h2 className="text-xl font-bold">{title}</h2>
    </section>
  );
};

export default StitchComponent;
