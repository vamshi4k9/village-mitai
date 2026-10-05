import React, { useState } from "react";
import DashboardShell from "./DashboardShell";
import PaymentResultModal from "./PaymentResultModal";
import "../styles/FormPage.css";
import "../styles/RecruitForm.css";
import axios from "axios";
import { API_BASE_URL } from '../constants';

const Required = () => <span className="fp-required">*</span>;

const RecruitForm = () => {
    const initialForm = {
        fullName: "",
        dob: "",
        gender: "",
        phone: "",
        email: "",
        city: "",
        languages: [],
        qualification: "",
        ownBike: "",
        marketingExperience: "",
        preferredLocation: "",
        dailyHours: "",
        flyerWillingness: "",
        salaryPreference: "",
        role: "",
    };

    const [form, setForm] = useState(initialForm);
    const [error, setError] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === "checkbox") {
            const updatedLanguages = checked
                ? [...form.languages, value]
                : form.languages.filter((lang) => lang !== value);
            setForm((prevForm) => ({ ...prevForm, languages: updatedLanguages }));
        } else {
            setForm((prevForm) => ({ ...prevForm, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const requiredFields = [
            "fullName", "dob", "gender", "phone", "city",
            "languages", "qualification", "ownBike", "marketingExperience",
            "preferredLocation", "dailyHours", "flyerWillingness", "salaryPreference", "role"
        ];

        const missingFields = requiredFields.filter(field =>
            Array.isArray(form[field]) ? form[field].length === 0 : !form[field]
        );

        if (missingFields.length > 0) {
            setError("Please fill all mandatory fields.");
            return;
        }

        setError("");

        const payload = {
            full_name: form.fullName,
            dob: form.dob,
            gender: form.gender,
            mobile_number: form.phone,
            email: form.email,
            city_area: form.city,
            languages_spoken: form.languages,
            qualification: form.qualification,
            owns_vehicle: form.ownBike === "Yes",
            has_field_experience: form.marketingExperience === "Yes",
            preferred_work_location: form.preferredLocation,
            daily_commitment: form.dailyHours,
            willing_for_fieldwork: form.flyerWillingness === "Yes",
            salary_preference: form.salaryPreference,
            role: form.role,
        };

        try {
            await axios.post(`${API_BASE_URL}/submit-recruit/`, payload);
            setShowSuccess(true);
            setForm(initialForm);
        } catch (error) {
            console.error("Error submitting form:", error);
            setError("Submission failed. Please try again.");
        }
    };


    const handleDialogClose = () => {
        setShowSuccess(false);
        setForm(initialForm);
    };

    return (
        <DashboardShell title="Join Our Team" subtitle="Tell us about yourself and the role you want">
            <form className="fp-form" onSubmit={handleSubmit} noValidate>

                <div className="fp-panel">
                    <h2 className="fp-panel-title">Personal Details</h2>

                    <div className="fp-row">
                        <div className="fp-field">
                            <label htmlFor="recruit-name" className="fp-label">Full Name<Required /></label>
                            <input id="recruit-name" type="text" name="fullName" className="fp-input" value={form.fullName} onChange={handleChange} autoComplete="name" />
                        </div>

                        <div className="fp-field">
                            <label htmlFor="recruit-dob" className="fp-label">Date of Birth<Required /></label>
                            <input id="recruit-dob" type="date" name="dob" className="fp-input" value={form.dob} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="fp-row">
                        <div className="fp-field">
                            <label htmlFor="recruit-gender" className="fp-label">Gender<Required /></label>
                            <select id="recruit-gender" name="gender" className="fp-input" value={form.gender} onChange={handleChange}>
                                <option value="">Select Gender</option>
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </div>

                        <div className="fp-field">
                            <label htmlFor="recruit-city" className="fp-label">City / Area of Residence<Required /></label>
                            <input id="recruit-city" type="text" name="city" className="fp-input" value={form.city} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="fp-row">
                        <div className="fp-field">
                            <label htmlFor="recruit-phone" className="fp-label">Mobile Number (WhatsApp preferred)<Required /></label>
                            <input id="recruit-phone" type="tel" name="phone" className="fp-input" value={form.phone} onChange={handleChange} autoComplete="tel" />
                        </div>

                        <div className="fp-field">
                            <label htmlFor="recruit-email" className="fp-label">Email ID (Optional)</label>
                            <input id="recruit-email" type="email" name="email" className="fp-input" value={form.email} onChange={handleChange} autoComplete="email" />
                        </div>
                    </div>
                </div>

                <div className="fp-panel">
                    <h2 className="fp-panel-title">Background</h2>

                    <div className="fp-field">
                        <span className="fp-label">Languages Spoken<Required /></span>
                        <div className="fp-choices">
                            {["English", "Hindi", "Telugu", "Tamil", "Kannada"].map((lang) => (
                                <label key={lang} className="fp-choice">
                                    <input
                                        type="checkbox"
                                        name="languages"
                                        value={lang}
                                        checked={form.languages.includes(lang)}
                                        onChange={handleChange}
                                    />
                                    {lang}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="fp-row">
                        <div className="fp-field">
                            <label htmlFor="recruit-qualification" className="fp-label">Highest Qualification<Required /></label>
                            <select id="recruit-qualification" name="qualification" className="fp-input" value={form.qualification} onChange={handleChange}>
                                <option value="">Select Qualification</option>
                                <option>10th</option>
                                <option>12th</option>
                                <option>Graduate</option>
                                <option>Postgraduate</option>
                            </select>
                        </div>

                        <div className="fp-field">
                            <label htmlFor="recruit-experience" className="fp-label">Prior field marketing experience?<Required /></label>
                            <select id="recruit-experience" name="marketingExperience" className="fp-input" value={form.marketingExperience} onChange={handleChange}>
                                <option value="">Select</option>
                                <option>Yes</option>
                                <option>No</option>
                            </select>
                        </div>
                    </div>

                    <div className="fp-field">
                        <label htmlFor="recruit-bike" className="fp-label">Own a bike/scooter for local travel?<Required /></label>
                        <select id="recruit-bike" name="ownBike" className="fp-input" value={form.ownBike} onChange={handleChange}>
                            <option value="">Select</option>
                            <option>Yes</option>
                            <option>No</option>
                        </select>
                    </div>
                </div>

                <div className="fp-panel">
                    <h2 className="fp-panel-title">Work Preferences</h2>

                    <div className="fp-row">
                        <div className="fp-field">
                            <label htmlFor="recruit-location" className="fp-label">Preferred Work Location/Area<Required /></label>
                            <input id="recruit-location" type="text" name="preferredLocation" className="fp-input" value={form.preferredLocation} onChange={handleChange} />
                        </div>

                        <div className="fp-field">
                            <label htmlFor="recruit-hours" className="fp-label">How many hours can you commit daily?<Required /></label>
                            <select id="recruit-hours" name="dailyHours" className="fp-input" value={form.dailyHours} onChange={handleChange}>
                                <option value="">Select</option>
                                <option>2 Hours</option>
                                <option>4 Hours</option>
                                <option>6 Hours</option>
                                <option>Full-time</option>
                                <option>Flexible</option>
                            </select>
                        </div>
                    </div>

                    <div className="fp-field">
                        <label htmlFor="recruit-flyer" className="fp-label">Willing to distribute flyers, visit stores, and talk to people directly?<Required /></label>
                        <select id="recruit-flyer" name="flyerWillingness" className="fp-input" value={form.flyerWillingness} onChange={handleChange}>
                            <option value="">Select</option>
                            <option>Yes</option>
                            <option>No</option>
                        </select>
                    </div>

                    <div className="fp-field">
                        <span className="fp-label">Salary Preference<Required /></span>
                        <div className="fp-choices">
                            {["Salary-Based", "Commission-Based", "Open to Both"].map((opt) => (
                                <label key={opt} className="fp-choice">
                                    <input
                                        type="radio"
                                        name="salaryPreference"
                                        value={opt}
                                        checked={form.salaryPreference === opt}
                                        onChange={handleChange}
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="fp-field">
                        <span className="fp-label">Applying For<Required /></span>
                        <div className="fp-choices">
                            {["Delivery Partner", "Field Agent", "Cook"].map((role) => (
                                <label key={role} className="fp-choice">
                                    <input
                                        type="radio"
                                        name="role"
                                        value={role}
                                        checked={form.role === role}
                                        onChange={handleChange}
                                    />
                                    {role}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="fp-alert error" role="alert">
                        <i className="bi bi-exclamation-circle" aria-hidden="true"></i>
                        {error}
                    </div>
                )}

                <button type="submit" className="fp-btn">Submit</button>
            </form>

            <PaymentResultModal
                open={showSuccess}
                status="success"
                title="Details Sent"
                message="Details sent successfully. We will contact you shortly."
                onClose={handleDialogClose}
            />
        </DashboardShell>
    );
};

export default RecruitForm;
