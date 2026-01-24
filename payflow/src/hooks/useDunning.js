import { useState, useEffect } from "react";
import { dunningAPI } from "../api/dunning.api";

export const useDunning = () => {
  const [dunningList, setDunningList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDunningList = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await dunningAPI.getList();
      setDunningList(response.data.dunning_cases || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch dunning list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDunningList();
  }, []);

  const groupedByRisk = {
    high: dunningList.filter((item) => item.riskLevel === "high"),
    medium: dunningList.filter((item) => item.riskLevel === "medium"),
    low: dunningList.filter((item) => item.riskLevel === "low"),
  };

  return {
    dunningList,
    groupedByRisk,
    loading,
    error,
    refetch: fetchDunningList,
  };
};
