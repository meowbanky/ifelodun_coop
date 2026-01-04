import { useState, useEffect } from "react";
import api from "../services/api";
import DocumentManagement from "../pages/DocumentManagement";
import { useAuth } from "../context/AuthContext";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { motion } from "framer-motion";
import Dialog from "../components/Dialog"; // Import the new Dialog component

function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    gender: "M",
    address: "",
    phoneNumber: "",
    idType: "",
    idNumber: "",
    employmentStatus: "",
    nextOfKin: {
      firstName: "",
      lastName: "",
      relationship: "",
      phoneNumber: "",
      address: "",
    },
  });
  const [dialog, setDialog] = useState({ message: "", type: "", show: false }); // State for dialog
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredMembers, setFilteredMembers] = useState([]);
  const { user } = useAuth();

  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  useEffect(() => {
    console.log("Current user:", user);
    fetchMembers();
  }, []);

  useEffect(() => {
    if (selectedMember && showForm) {
      setFormData({
        firstName: selectedMember.first_name || "",
        lastName: selectedMember.last_name || "",
        email: selectedMember.email || "",
        dateOfBirth: selectedMember.date_of_birth
          ? selectedMember.date_of_birth.split("T")[0]
          : "",
        gender: selectedMember.gender || "M",
        address: selectedMember.address || "",
        phoneNumber: selectedMember.phone_number || "",
        idType: selectedMember.id_type || "",
        idNumber: selectedMember.id_number || "",
        employmentStatus: selectedMember.employment_status || "",
        nextOfKin: {
          firstName: selectedMember.next_of_kin_first_name || "",
          lastName: selectedMember.next_of_kin_last_name || "",
          relationship: selectedMember.next_of_kin_relationship || "",
          phoneNumber: selectedMember.next_of_kin_phone_number || "",
          address: selectedMember.next_of_kin_address || "",
        },
      });
    }
  }, [selectedMember, showForm]);

  const fetchMembers = async () => {
    try {
      const response = await api.get("/members/list", { headers: authHeader });
      setMembers(response.data.data || []);
      setFilteredMembers(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch members:", err);
      setDialog({
        message: err.response?.data?.message || "Failed to load members.",
        type: "error",
        show: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberDetails = async (id) => {
    try {
      const response = await api.get(`/members/${id}`, { headers: authHeader });
      const memberDetails = response.data.data;
      const memberFromList = members.find((m) => m.id === parseInt(id));
      setSelectedMember({
        ...memberDetails,
        loan_balance: memberFromList?.loan_balance || "0",
        active_loan_count: memberFromList?.active_loan_count || "0",
      });
    } catch (err) {
      console.error("Failed to fetch member details:", err);
      setDialog({
        message:
          err.response?.data?.message || "Failed to load member details.",
        type: "error",
        show: true,
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes("nextOfKin.")) {
      const key = name.split(".")[1];
      setFormData({
        ...formData,
        nextOfKin: { ...formData.nextOfKin, [key]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedMember) {
        await api.put(`/members/${selectedMember.id}`, formData, {
          headers: authHeader,
        });
        setDialog({
          message: "Member updated successfully!",
          type: "success",
          show: true,
        });
      } else {
        const response = await api.post("/members/register", formData, {
          headers: authHeader,
        });
        setDialog({
          message: response.data.message || "Member registered successfully!",
          type: "success",
          show: true,
        });
      }

      setShowForm(false);
      setSelectedMember(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        dateOfBirth: "",
        gender: "M",
        address: "",
        phoneNumber: "",
        idType: "",
        idNumber: "",
        employmentStatus: "",
        nextOfKin: {
          firstName: "",
          lastName: "",
          relationship: "",
          phoneNumber: "",
          address: "",
        },
      });
      await fetchMembers();
    } catch (err) {
      console.error("Failed to save member:", err);
      setDialog({
        message: err.response?.data?.message || "Failed to save member.",
        type: "error",
        show: true,
      });
    }
  };

  const handleEdit = (member) => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      dateOfBirth: "",
      gender: "M",
      address: "",
      phoneNumber: "",
      idType: "",
      idNumber: "",
      employmentStatus: "",
      nextOfKin: {
        firstName: "",
        lastName: "",
        relationship: "",
        phoneNumber: "",
        address: "",
      },
    });
    fetchMemberDetails(member.id);
    setShowForm(true);
  };

  const handleDocumentUpload = () => {
    if (selectedMember) {
      fetchMemberDetails(selectedMember.id);
      setDialog({
        message: "Document uploaded successfully!",
        type: "success",
        show: true,
      });
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value) {
      const filtered = members.filter(
        (member) =>
          `${member.first_name} ${member.last_name}`
            .toLowerCase()
            .includes(value.toLowerCase()) ||
          member.member_id.toString().includes(value)
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers(members);
    }
  };

  const handleSelectMember = (member) => {
    setSearchTerm("");
    setFilteredMembers(members);
    fetchMemberDetails(member.id);
  };

  const exportToExcel = async () => {
    try {
      const ws = XLSX.utils.json_to_sheet(
        members.map((member) => ({
          "Member ID": member.member_id,
          Name: `${member.first_name} ${member.last_name}`,
          Phone: member.phone_number,
          Savings: formatNGN(member.total_savings || 0),
          "Loan Balance": formatNGN(member.loan_balance || 0),
          "Active Loans": member.active_loan_count || "0",
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Members");
      XLSX.writeFile(wb, "members.xlsx");
      setDialog({
        message: "Exported to Excel successfully!",
        type: "success",
        show: true,
      });
    } catch (error) {
      console.error("Excel export failed:", error);
      setDialog({
        message: "Failed to export to Excel.",
        type: "error",
        show: true,
      });
    }
  };

  const exportToPDF = async () => {
    const input = document.getElementById("members-table");
    if (!input) {
      setDialog({
        message: "Table not found for PDF export.",
        type: "error",
        show: true,
      });
      return;
    }
    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        windowWidth: 1024,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save("members.pdf");
      setDialog({
        message: "Exported to PDF successfully!",
        type: "success",
        show: true,
      });
    } catch (error) {
      console.error("PDF export failed:", error);
      setDialog({
        message: "Failed to export to PDF.",
        type: "error",
        show: true,
      });
    }
  };

  const formatNGN = (value) => {
    const num = parseFloat(value) || 0;
    return num.toLocaleString("en-NG", { style: "currency", currency: "NGN" });
  };

  const closeDialog = () => {
    setDialog({ message: "", type: "", show: false });
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen font-['Inter']">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Members
          </h1>
          {user?.role === "admin" && (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-lg shadow-md hover:from-indigo-700 hover:to-blue-800 text-sm min-w-[120px]"
              >
                Add Member
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={exportToExcel}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow-md hover:from-green-600 hover:to-emerald-700 text-sm min-w-[120px]"
              >
                Export to Excel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={exportToPDF}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg shadow-md hover:from-red-600 hover:to-pink-700 text-sm min-w-[120px]"
              >
                Export to PDF
              </motion.button>
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 relative"
        >
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search by name or member ID..."
            aria-label="Search members by name or ID"
            className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
          {searchTerm && filteredMembers.length > 0 && (
            <ul className="absolute z-10 w-full max-w-[90vw] sm:max-w-md bg-white border border-gray-200 rounded-lg mt-1 shadow-xl max-h-60 overflow-y-auto">
              {filteredMembers.map((member) => (
                <li
                  key={member.id}
                  onClick={() => handleSelectMember(member)}
                  className="p-2.5 text-sm hover:bg-indigo-50 cursor-pointer transition-colors"
                >
                  {`${member.first_name} ${member.last_name} (ID: ${member.member_id})`}
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-md overflow-x-auto"
            id="members-table"
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Savings
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Loan Balance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                    Active Loans
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {member.member_id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {`${member.first_name} ${member.last_name}`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">
                      {member.phone_number || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                      {formatNGN(member.total_savings || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                      {formatNGN(member.loan_balance || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 hidden xl:table-cell">
                      {member.active_loan_count || "0"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      {user?.role === "admin" && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEdit(member)}
                          className="text-indigo-600 hover:text-indigo-800 mr-3 text-sm"
                        >
                          Edit
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => fetchMemberDetails(member.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View
                      </motion.button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50"
          >
            <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-[90vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">
                {selectedMember ? "Update Member" : "Add New Member"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5"
                    >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Address
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5"
                      rows="3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ID Type
                    </label>
                    <input
                      type="text"
                      name="idType"
                      value={formData.idType}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ID Number
                    </label>
                    <input
                      type="text"
                      name="idNumber"
                      value={formData.idNumber}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Employment Status
                    </label>
                    <input
                      type="text"
                      name="employmentStatus"
                      value={formData.employmentStatus}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5"
                    />
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900">
                  Next of Kin
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="nextOfKin.firstName"
                      value={formData.nextOfKin.firstName}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="nextOfKin.lastName"
                      value={formData.nextOfKin.lastName}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Relationship
                    </label>
                    <input
                      type="text"
                      name="nextOfKin.relationship"
                      value={formData.nextOfKin.relationship}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      name="nextOfKin.phoneNumber"
                      value={formData.nextOfKin.phoneNumber}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Address
                    </label>
                    <textarea
                      name="nextOfKin.address"
                      value={formData.nextOfKin.address}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5"
                      rows="3"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setSelectedMember(null);
                      setFormData({
                        firstName: "",
                        lastName: "",
                        email: "",
                        dateOfBirth: "",
                        gender: "M",
                        address: "",
                        phoneNumber: "",
                        idType: "",
                        idNumber: "",
                        employmentStatus: "",
                        nextOfKin: {
                          firstName: "",
                          lastName: "",
                          relationship: "",
                          phoneNumber: "",
                          address: "",
                        },
                      });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm min-w-[100px]"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-lg hover:from-indigo-700 hover:to-blue-800 text-sm min-w-[100px]"
                  >
                    {selectedMember ? "Update" : "Register"}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {selectedMember && !showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-1000"
          >
            <div className="bg-white rounded-xl shadow-md p-6 w-full max-w-[90vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">
                Member Details
              </h2>
              <div className="space-y-3 text-sm">
                <p>
                  <strong className="text-gray-700">Member ID:</strong>{" "}
                  {selectedMember.member_id}
                </p>
                <p>
                  <strong className="text-gray-700">Name:</strong>{" "}
                  {`${selectedMember.first_name} ${selectedMember.last_name}`}
                </p>
                <p>
                  <strong className="text-gray-700">Email:</strong>{" "}
                  {selectedMember.email || "N/A"}
                </p>
                <p>
                  <strong className="text-gray-700">Username:</strong>{" "}
                  {selectedMember.username || "N/A"}
                </p>
                <p>
                  <strong className="text-gray-700">Date of Birth:</strong>{" "}
                  {selectedMember.date_of_birth
                    ? new Date(
                        selectedMember.date_of_birth
                      ).toLocaleDateString()
                    : "N/A"}
                </p>
                <p>
                  <strong className="text-gray-700">Gender:</strong>{" "}
                  {selectedMember.gender === "M"
                    ? "Male"
                    : selectedMember.gender === "F"
                    ? "Female"
                    : selectedMember.gender || "N/A"}
                </p>
                <p>
                  <strong className="text-gray-700">Address:</strong>{" "}
                  {selectedMember.address || "N/A"}
                </p>
                <p>
                  <strong className="text-gray-700">Phone:</strong>{" "}
                  {selectedMember.phone_number || "N/A"}
                </p>
                <p>
                  <strong className="text-gray-700">ID Type:</strong>{" "}
                  {selectedMember.id_type || "N/A"}
                </p>
                <p>
                  <strong className="text-gray-700">ID Number:</strong>{" "}
                  {selectedMember.id_number || "N/A"}
                </p>
                <p>
                  <strong className="text-gray-700">Employment Status:</strong>{" "}
                  {selectedMember.employment_status || "N/A"}
                </p>
                <p>
                  <strong className="text-gray-700">Savings:</strong>{" "}
                  {formatNGN(selectedMember.total_savings || 0)}
                </p>
                <p>
                  <strong className="text-gray-700">Loan Balance:</strong>{" "}
                  {formatNGN(selectedMember.loan_balance || 0)}
                </p>
                <p>
                  <strong className="text-gray-700">Active Loans:</strong>{" "}
                  {selectedMember.active_loan_count || "0"}
                </p>
                <h3 className="text-base font-semibold text-gray-700 mt-3">
                  Next of Kin
                </h3>
                <p>
                  <strong className="text-gray-700">Name:</strong>{" "}
                  {`${selectedMember.next_of_kin_first_name || "N/A"} ${
                    selectedMember.next_of_kin_last_name || ""
                  }`}
                </p>
                <p>
                  <strong className="text-gray-700">Relationship:</strong>{" "}
                  {selectedMember.next_of_kin_relationship || "N/A"}
                </p>
                <p>
                  <strong className="text-gray-700">Phone:</strong>{" "}
                  {selectedMember.next_of_kin_phone_number || "N/A"}
                </p>
                <p>
                  <strong className="text-gray-700">Address:</strong>{" "}
                  {selectedMember.next_of_kin_address || "N/A"}
                </p>
                <div className="mt-3">
                  <h3 className="text-base font-semibold text-gray-700 mb-1">
                    Documents
                  </h3>
                  <DocumentManagement
                    memberId={selectedMember.id}
                    onUpload={handleDocumentUpload}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                {user?.role === "admin" && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleEdit(selectedMember)}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-lg shadow-sm hover:from-blue-700 hover:to-blue-800 text-sm min-w-[100px]"
                  >
                    Edit
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedMember(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg shadow-sm hover:bg-gray-700 text-sm min-w-[100px]"
                >
                  Close
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {dialog.show && (
          <Dialog
            message={dialog.message}
            type={dialog.type}
            onClose={closeDialog}
          />
        )}
      </div>
    </div>
  );
}

export default Members;
