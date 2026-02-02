/**
 * useSubscriptions Hook
 * Fetch customer subscriptions
 */

import { useState, useEffect } from "react";
import { subscriptionAPI } from "../api/subscription.api";

export const useSubscriptions = (customerId) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!customerId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await subscriptionAPI.listByCustomer(customerId);
        setSubscriptions(response.data?.data || []);
      } catch (err) {
        console.error("Error fetching subscriptions:", err);
        setError(err.response?.data?.error || "Failed to load subscriptions");
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, [customerId]);

  const refetch = async () => {
    if (!customerId) return;

    setLoading(true);
    try {
      const response = await subscriptionAPI.listByCustomer(customerId);
      setSubscriptions(response.data?.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reload subscriptions");
    } finally {
      setLoading(false);
    }
  };

  return {
    subscriptions,
    loading,
    error,
    refetch,
  };
};
