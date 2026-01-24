import React from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import StatusBadge from "./StatusBadge";
import Button from "../common/Button";

const CustomerRow = ({ customer }) => {
  const navigate = useNavigate();

  return (
    <tr
      className="hover:bg-gray-50 cursor-pointer"
      onClick={() => navigate(`/customers/${customer.id}`)}
    >
      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-gray-900">
            {customer.name || "Unknown"}
          </p>
          <p className="text-sm text-gray-500">{customer.email}</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={customer.status} />
      </td>
      <td className="px-6 py-4 text-gray-900 font-medium">
        {formatCurrency(customer.mrr)}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {formatDate(customer.createdAt)}
      </td>
      <td className="px-6 py-4 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/customers/${customer.id}`);
          }}
        >
          View Details
        </Button>
      </td>
    </tr>
  );
};

export default CustomerRow;
