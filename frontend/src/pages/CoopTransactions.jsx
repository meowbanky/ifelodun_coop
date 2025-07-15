import { useState, useEffect } from "react";
import api from "../services/api";
import Dialog from "../components/Dialog";
import {
  PlusIcon,
  MinusIcon,
  TrashIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/solid";

const CoopTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [form, setForm] = useState({
    type: "income",
    amount: "",
    description: "",
    category: "",
    periodId: "",
  });
  const [filters, setFilters] = useState({
    type: "",
    category: "",
    periodId: "",
  });
  const [dialog, setDialog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState({
    open: false,
    transaction: null,
  });
  const [editForm, setEditForm] = useState({
    type: "income",
    amount: "",
    description: "",
    category: "",
    periodId: "",
  });
  // Add state for add category modal and form
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [addCategoryForm, setAddCategoryForm] = useState({
    name: "",
    type: form.type,
  });
  const [addCategoryLoading, setAddCategoryLoading] = useState(false);
  // Edit category modal state
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editCategoryForm, setEditCategoryForm] = useState({
    id: "",
    name: "",
    type: form.type,
  });
  const [editCategoryLoading, setEditCategoryLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      setFilters((f) => ({ ...f, periodId: selectedPeriod }));
      fetchTransactions({ ...filters, periodId: selectedPeriod });
    }
    // eslint-disable-next-line
  }, [selectedPeriod]);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      setCategories(res.data.data || []);
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to load categories",
        type: "error",
      });
    }
  };

  const fetchPeriods = async () => {
    try {
      const res = await api.get("/periods/list");
      setPeriods(res.data.data || []);
      // Default to open period
      const open = res.data.data.find((p) => p.status === "open");
      setSelectedPeriod(open ? open.id : res.data.data[0]?.id || "");
      setForm((f) => ({
        ...f,
        periodId: open ? open.id : res.data.data[0]?.id || "",
      }));
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to load periods",
        type: "error",
      });
    }
  };

  const fetchTransactions = async (filterObj = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filterObj).forEach(([k, v]) => v && params.append(k, v));
      const res = await api.get(`/coop-transactions?${params.toString()}`);
      setTransactions(res.data.data || []);
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to load transactions",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchTransactions(filters);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post("/coop-transactions", form);
      setDialog({ message: "Transaction added!", type: "success" });
      setForm((f) => ({ ...f, amount: "", description: "" }));
      fetchTransactions({ ...filters, periodId: form.periodId });
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to add transaction",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add delete handler
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    setLoading(true);
    try {
      await api.delete(`/coop-transactions/${id}`);
      setDialog({ message: "Transaction deleted!", type: "success" });
      fetchTransactions(filters);
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to delete.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (transaction) => {
    setEditForm({
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      periodId: transaction.period_id,
    });
    setEditModal({ open: true, transaction });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((f) => ({ ...f, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editModal.transaction) return;
    setLoading(true);
    try {
      await api.put(`/coop-transactions/${editModal.transaction.id}`, editForm);
      setDialog({ message: "Transaction updated!", type: "success" });
      setEditModal({ open: false, transaction: null });
      fetchTransactions(filters);
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to update transaction",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle add category form changes
  const handleAddCategoryFormChange = (e) => {
    const { name, value } = e.target;
    setAddCategoryForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle add category submit
  const handleAddCategory = async (e) => {
    e.preventDefault();
    setAddCategoryLoading(true);
    setDialog(null);
    try {
      await api.post("/categories", addCategoryForm);
      setDialog({ message: "Category added successfully!", type: "success" });
      setAddCategoryForm({ name: "", type: form.type });
      setShowAddCategoryModal(false);
      fetchCategories();
    } catch (error) {
      setDialog({
        message: error.response?.data?.message || "Failed to add category",
        type: "error",
      });
    } finally {
      setAddCategoryLoading(false);
    }
  };

  // Open edit category modal with selected category
  const openEditCategoryModal = () => {
    const selectedCat = categories.find(
      (c) => c.name === form.category && c.type === form.type
    );
    if (selectedCat) {
      setEditCategoryForm({
        id: selectedCat.id,
        name: selectedCat.name,
        type: selectedCat.type,
      });
      setShowEditCategoryModal(true);
    }
  };

  // Handle edit category form changes
  const handleEditCategoryFormChange = (e) => {
    const { name, value } = e.target;
    setEditCategoryForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle edit category submit
  const handleEditCategory = async (e) => {
    e.preventDefault();
    setEditCategoryLoading(true);
    setDialog(null);
    try {
      await api.put(`/categories/${editCategoryForm.id}`, {
        name: editCategoryForm.name,
        type: editCategoryForm.type,
      });
      setDialog({ message: "Category updated successfully!", type: "success" });
      setEditCategoryForm({ id: "", name: "", type: form.type });
      setShowEditCategoryModal(false);
      fetchCategories();
    } catch (error) {
      setDialog({
        message: error.response?.data?.message || "Failed to update category",
        type: "error",
      });
    } finally {
      setEditCategoryLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Cooperative Transactions</h2>
      {dialog && (
        <Dialog
          message={dialog.message}
          type={dialog.type}
          onClose={() => setDialog(null)}
        />
      )}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded shadow mb-6"
      >
        <div>
          <label className="block text-sm font-medium">Type</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            required
            className="mt-1 block w-full border rounded p-2"
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Category</label>
          <div className="flex gap-2 items-center">
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              className="mt-1 block w-full border rounded p-2"
            >
              <option value="">Select</option>
              {categories
                .filter((c) => c.type === form.type)
                .map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={() => setShowAddCategoryModal(true)}
              className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
              title="Add new category"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={openEditCategoryModal}
              className="p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 flex items-center"
              title="Edit selected category"
              disabled={!form.category}
            >
              <PencilSquareIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Amount</label>
          <input
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="mt-1 block w-full border rounded p-2"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">Description</label>
          <input
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            className="mt-1 block w-full border rounded p-2"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">Period</label>
          <select
            name="periodId"
            value={form.periodId}
            onChange={handleChange}
            required
            className="mt-1 block w-full border rounded p-2"
          >
            <option value="">Select Period</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? "Saving..." : "Add Transaction"}
          </button>
        </div>
      </form>
      <form
        onSubmit={handleFilterSubmit}
        className="flex flex-wrap gap-2 mb-4 items-end"
      >
        <div>
          <label className="block text-xs font-medium">Type</label>
          <select
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            className="border rounded px-2 py-1"
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium">Category</label>
          <select
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            className="border rounded px-2 py-1"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium">Period</label>
          <select
            name="periodId"
            value={filters.periodId}
            onChange={handleFilterChange}
            className="border rounded px-2 py-1"
          >
            <option value="">All Periods</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-gray-600 text-white px-4 py-1 rounded hover:bg-gray-700"
        >
          Filter
        </button>
      </form>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-2xl shadow text-sm">
          <thead>
            <tr>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Period</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, idx) => (
              <tr
                key={t.id}
                className={`transition hover:bg-indigo-50 ${
                  idx % 2 === 0 ? "bg-gray-50" : "bg-white"
                }`}
                style={{
                  borderRadius:
                    idx === 0
                      ? "1rem 1rem 0 0"
                      : idx === transactions.length - 1
                      ? "0 0 1rem 1rem"
                      : undefined,
                }}
              >
                <td className="px-4 py-2 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow-sm
                      ${
                        t.type === "income"
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-red-100 text-red-700 border border-red-200"
                      }
                    `}
                    title={
                      t.type === "income"
                        ? "Income transaction"
                        : "Expense transaction"
                    }
                  >
                    {t.type === "income" ? (
                      <PlusIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <MinusIcon className="h-4 w-4 text-red-500" />
                    )}
                    {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-gray-700 font-medium">
                  {t.category}
                </td>
                <td className="px-4 py-2 whitespace-nowrap font-semibold text-gray-900">
                  ₦{parseFloat(t.amount).toLocaleString()}
                </td>
                <td
                  className="px-4 py-2 whitespace-nowrap text-gray-500 max-w-xs truncate"
                  title={t.description}
                >
                  {t.description}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-gray-600">
                  {periods.find((p) => p.id === t.period_id)?.name || "-"}
                </td>
                <td className="px-4 py-2 text-center flex gap-2 justify-center">
                  <button
                    onClick={() => openEdit(t)}
                    className="inline-flex items-center justify-center p-1 rounded-full bg-blue-50 hover:bg-blue-200 transition"
                    title="Edit transaction"
                  >
                    <PencilSquareIcon className="h-5 w-5 text-blue-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="inline-flex items-center justify-center p-1 rounded-full bg-red-50 hover:bg-red-200 transition"
                    title="Delete transaction"
                  >
                    <TrashIcon className="h-5 w-5 text-red-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Edit Modal */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Edit Transaction</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Type</label>
                <select
                  name="type"
                  value={editForm.type}
                  onChange={handleEditChange}
                  required
                  className="mt-1 block w-full border rounded p-2"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Category</label>
                <select
                  name="category"
                  value={editForm.category}
                  onChange={handleEditChange}
                  required
                  className="mt-1 block w-full border rounded p-2"
                >
                  <option value="">Select</option>
                  {categories
                    .filter((c) => c.type === editForm.type)
                    .map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Amount</label>
                <input
                  type="number"
                  name="amount"
                  value={editForm.amount}
                  onChange={handleEditChange}
                  required
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Description</label>
                <input
                  type="text"
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  className="mt-1 block w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Period</label>
                <select
                  name="periodId"
                  value={editForm.periodId}
                  onChange={handleEditChange}
                  required
                  className="mt-1 block w-full border rounded p-2"
                >
                  <option value="">Select Period</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setEditModal({ open: false, transaction: null })
                  }
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Category</h3>
            <form onSubmit={handleAddCategory}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={addCategoryForm.name}
                  onChange={handleAddCategoryFormChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter category name"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  name="type"
                  value={addCategoryForm.type}
                  onChange={handleAddCategoryFormChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addCategoryLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {addCategoryLoading ? "Adding..." : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Category Modal */}
      {showEditCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Category</h3>
            <form onSubmit={handleEditCategory}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={editCategoryForm.name}
                  onChange={handleEditCategoryFormChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter category name"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  name="type"
                  value={editCategoryForm.type}
                  onChange={handleEditCategoryFormChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditCategoryModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editCategoryLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {editCategoryLoading ? "Updating..." : "Update Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoopTransactions;
