/**
 * useCustomerData Hook
 * Fetch current user's customer information
 */

import { useState, useEffect } from "react";
import { customerAPI } from "../api/customer.api";
import { useAuth } from "./useAuth";

export const useCustomerData = () => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await customerAPI.getAll();

        // Get first customer for current user or create one
        if (response.data?.data && response.data.data.length > 0) {
          setCustomer(response.data.data[0]);
        } else {
          // No customer found - this might need customer creation flow
          setCustomer(null);
        }
      } catch (err) {
        console.error("Error fetching customer:", err);
        setError(err.response?.data?.error || "Failed to load customer data");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [user]);

  const refetch = async () => {
    setLoading(true);
    try {
      const response = await customerAPI.getAll();
      if (response.data?.data && response.data.data.length > 0) {
        setCustomer(response.data.data[0]);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reload customer data");
    } finally {
      setLoading(false);
    }
  };

  return {
    customer,
    customerId: customer?.id,
    loading,
    error,
    refetch,
  };
};
