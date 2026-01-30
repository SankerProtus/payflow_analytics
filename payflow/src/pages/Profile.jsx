import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Building2, Lock, ArrowLeft, Save, X } from "lucide-react";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import Layout from "../components/layout/Layout";
import { AuthContext } from "../context/AuthContext";
import { getProfile, updateProfile, updatePassword } from "../api/auth.api";
import { storage } from "../utils/localStorage";
import { CircleUser } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");

  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    companyName: "",
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProfile();
      setProfileData({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        email: data.email || "",
        companyName: data.companyName || "",
      });
    } catch (err) {
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!profileData.firstName.trim()) {
      setError("First name is required");
      return;
    }

    if (!profileData.email.trim()) {
      setError("Email is required");
      return;
    }

    try {
      setSaving(true);
      const updatedUser = await updateProfile(profileData);
      setUser(updatedUser);
      storage.setUser(updatedUser);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!passwordData.currentPassword) {
      setError("Current password is required");
      return;
    }

    if (!passwordData.newPassword) {
      setError("New password is required");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    try {
      setSaving(true);
      await updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setSuccess("Password updated successfully!");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (activeTab === "profile") {
      fetchProfile(); // Reset to original data
    } else {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
    setError(null);
    setSuccess(null);
  };

  if (loading) {
    return (
      <Layout>
        <Loader fullScreen />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
          <div className="flex items-center gap-6">
            <CircleUser className="h-15 w-15 text-gray-400 text-primary-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 text-primary-600">
                Account Settings
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your profile information and security settings
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex -mb-px space-x-8">
            <button
              onClick={() => {
                setActiveTab("profile");
                setError(null);
                setSuccess(null);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "profile"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <User className="h-5 w-5 inline-block mr-2" />
              Profile Information
            </button>
            <button
              onClick={() => {
                setActiveTab("security");
                setError(null);
                setSuccess(null);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "security"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Lock className="h-5 w-5 inline-block mr-2" />
              Security
            </button>
          </nav>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center">
            <svg
              className="h-5 w-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {success}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Profile Information
              </h2>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="First Name"
                    name="firstName"
                    type="text"
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    icon={User}
                    placeholder="Enter your first name"
                    required
                  />
                  <Input
                    label="Last Name"
                    name="lastName"
                    type="text"
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                    icon={User}
                    placeholder="Enter your last name"
                  />
                </div>

                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  icon={Mail}
                  placeholder="your.email@example.com"
                  required
                  disabled
                  helperText="Email cannot be changed for security reasons"
                />

                <Input
                  label="Company Name"
                  name="companyName"
                  type="text"
                  value={profileData.companyName}
                  onChange={handleProfileChange}
                  icon={Building2}
                  placeholder="Enter your company name"
                />

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader size="sm" className="mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Change Password
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                Ensure your account stays secure by using a strong password
              </p>
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <Input
                  label="Current Password"
                  name="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  icon={Lock}
                  placeholder="Enter your current password"
                  required
                />

                <Input
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  icon={Lock}
                  placeholder="Enter your new password"
                  helperText="Must be at least 8 characters long"
                  required
                />

                <Input
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  icon={Lock}
                  placeholder="Confirm your new password"
                  required
                />

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader size="sm" className="mr-2" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Update Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
