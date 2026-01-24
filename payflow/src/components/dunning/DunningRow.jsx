import React from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency, centsToUSD } from "../../utils/formatCurrency";
import RiskBadge from "./RiskBadge";
import StatusBadge from "../customers/StatusBadge";
import Button from "../common/Button";

const DunningRow = ({ item }) => {
  const navigate = useNavigate();

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-gray-900">
            {item.customer.name || "Unknown"}
          </p>
          <p className="text-sm text-gray-500">{item.customer.email}</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <RiskBadge level={item.riskLevel} />
      </td>
      <td className="px-6 py-4">
        <span className="text-gray-900 font-medium">
          {item.daysOverdue} days
        </span>
      </td>
      <td className="px-6 py-4 text-gray-900 font-medium">
        {centsToUSD(item.amountDue)}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {item.retryCount} attempt{item.retryCount !== 1 ? "s" : ""}
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={item.subscriptionStatus} />
      </td>
      <td className="px-6 py-4 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/customers/${item.customer.id}`)}
        >
          View Customer
        </Button>
      </td>
    </tr>
  );
};

export default DunningRow;
