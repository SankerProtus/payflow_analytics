import { useState, useEffect, useCallback } from "react";
import { customerAPI } from "../api/customer.api";

export const useCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await customerAPI.getAll();
      // Backend returns { customers: [], total: N }
      setCustomers(response.data.customers || response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return { customers, loading, error, refetch: fetchCustomers };
};

export const useCustomerDetails = (customerId) => {
  const [customer, setCustomer] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCustomerDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [customerRes, timelineRes, statisticsRes] = await Promise.all([
        customerAPI.getById(customerId),
        customerAPI.getTimeline(customerId),
        customerAPI.getStatistics(customerId),
      ]);

      setCustomer(customerRes.data);
      setTimeline(timelineRes.data);
      setStatistics(statisticsRes.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to fetch customer details",
      );
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
    }
  }, [customerId, fetchCustomerDetails]);

  return { customer, timeline, statistics, loading, error };
};

export const useCustomerDetail = useCustomerDetails;
