import React, { useState } from "react";
import "../styles/RecruitForm.css";
import axios from "axios";
import { API_BASE_URL } from '../constants';


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
        <div className="register-container">
            <form className="register-card" onSubmit={handleSubmit}>
                <img
                    src={`${process.env.PUBLIC_URL}/images/villageLogoLong.png`}
                    alt="Logo"
                    className="register-logo"
                />
                <h2 className="register-heading">Join Our Team</h2>

                <label className="labelClass">Full Name<span className="required">*</span></label>
                <input type="text" name="fullName" className="register-input" value={form.fullName} onChange={handleChange} />

                <label className="labelClass">Date of Birth<span className="required">*</span></label>
                <input type="date" name="dob" className="register-input" value={form.dob} onChange={handleChange} />

                <label className="labelClass">Gender<span className="required">*</span></label>
                <select name="gender" className="register-input" value={form.gender} onChange={handleChange}>
                    <option value="">Select Gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                </select>

                <label className="labelClass">Mobile Number (WhatsApp preferred)<span className="required">*</span></label>
                <input type="tel" name="phone" className="register-input" value={form.phone} onChange={handleChange} />

                <label className="labelClass">Email ID (Optional)</label>
                <input type="email" name="email" className="register-input" value={form.email} onChange={handleChange} />

                <label className="labelClass">City / Area of Residence<span className="required">*</span></label>
                <input type="text" name="city" className="register-input" value={form.city} onChange={handleChange} />

                <label className="labelClass">Languages Spoken<span className="required">*</span></label>
                <div className="checkbox-group">
                    {["English", "Hindi", "Telugu", "Tamil", "Kannada"].map((lang) => (
                        <label key={lang} className="checkbox-label">
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

                <label className="labelClass">Highest Qualification<span className="required">*</span></label>
                <select name="qualification" className="register-input" value={form.qualification} onChange={handleChange}>
                    <option value="">Select Qualification</option>
                    <option>10th</option>
                    <option>12th</option>
                    <option>Graduate</option>
                    <option>Postgraduate</option>
                </select>

                <label className="labelClass">Own a bike/scooter for local travel?<span className="required">*</span></label>
                <select name="ownBike" className="register-input" value={form.ownBike} onChange={handleChange}>
                    <option value="">Select</option>
                    <option>Yes</option>
                    <option>No</option>
                </select>

                <label className="labelClass">Prior field marketing experience?<span className="required">*</span></label>
                <select name="marketingExperience" className="register-input" value={form.marketingExperience} onChange={handleChange}>
                    <option value="">Select</option>
                    <option>Yes</option>
                    <option>No</option>
                </select>

                <label className="labelClass">Preferred Work Location/Area<span className="required">*</span></label>
                <input type="text" name="preferredLocation" className="register-input" value={form.preferredLocation} onChange={handleChange} />

                <label className="labelClass">How many hours can you commit daily?<span className="required">*</span></label>
                <select name="dailyHours" className="register-input" value={form.dailyHours} onChange={handleChange}>
                    <option value="">Select</option>
                    <option>2 Hours</option>
                    <option>4 Hours</option>
                    <option>6 Hours</option>
                    <option>Full-time</option>
                    <option>Flexible</option>
                </select>

                <label className="labelClass">Willing to distribute flyers, visit stores, and talk to people directly?<span className="required">*</span></label>
                <select name="flyerWillingness" className="register-input" value={form.flyerWillingness} onChange={handleChange}>
                    <option value="">Select</option>
                    <option>Yes</option>
                    <option>No</option>
                </select>

                <label className="labelClass">Salary Preference<span className="required">*</span></label>
                <div className="radio-group">
                    {["Salary-Based", "Commission-Based", "Open to Both"].map((opt) => (
                        <label key={opt} className="radio-label">
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
                <label className="labelClass">
                    Applying For<span className="required">*</span>
                </label>
                

                <div className="radio-group role-group">
                    {["Delivery Partner", "Field Agent", "Cook"].map((role) => (
                        <label key={role} className="radio-label">
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

                {error && <div className="register-error">{error}</div>}

                <button type="submit" className="register-button">Submit</button>
            </form>

            {showSuccess && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <p className="modal-message">Details sent successfully. We will contact you shortly.</p>
                        <button className="modal-ok" onClick={handleDialogClose}>Okay</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecruitForm;
