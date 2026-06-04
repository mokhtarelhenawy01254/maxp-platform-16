import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";

export const useBlog = () => {
  const [searchParams] = useSearchParams();
  const companyId =
    searchParams.get("companyId") || localStorage.getItem("currentCompanyId");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    setSubmitting(true);
    try {
      // Mock subscription logic
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Thank you for subscribing to our journal!");
      setEmail("");
    } catch (error) {
      console.error("Error subscribing:", error);
      toast.error("An error occurred. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    companyId,
    email,
    setEmail,
    submitting,
    handleSubscribe,
  };
};
