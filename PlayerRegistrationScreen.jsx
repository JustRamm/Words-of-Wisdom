import React, { useState } from "react";
import GameBackground from "./GameBackground";

const PlayerRegistrationScreen = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    college: "",
    otherCollege: "",
    field_of_study: "",
    country: "India",
    state: "",
  });

  const [showOtherCollege, setShowOtherCollege] = useState(false);
  const [errors, setErrors] = useState({});

  const INDIAN_STATES = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry",
  ];

  const MAJOR_COLLEGES = [
    "Indian Institute of Science (IISc), Bangalore",
    "IIT Madras",
    "IIT Delhi",
    "IIT Bombay",
    "IIT Kanpur",
    "IIT Kharagpur",
    "IIT Roorkee",
    "IIT Guwahati",
    "AIIMS, New Delhi",
    "BITS Pilani",
    "University of Delhi",
    "Jawaharlal Nehru University (JNU)",
    "Banaras Hindu University (BHU)",
    "Anna University, Chennai",
    "VIT University, Vellore",
    "Cochin University of Science and Technology (CUSAT)",
    "Sahrudaya College of Engineering & Technology",
    "APJ Abdul Kalam Technological University (KTU)",
    "University of Kerala",
    "Mahatma Gandhi University, Kottayam",
    "University of Calicut",
    "NIT Calicut",
    "NIT Trichy",
    "NIT Surathkal",
    "Manipal Academy of Higher Education",
    "Savitribai Phule Pune University",
    "University of Mumbai",
    "University of Calcutta",
    "Jadavpur University",
    "Amrita Vishwa Vidyapeetham",
    "SRM Institute of Science and Technology",
    "Christ University",
    "TISS, Mumbai",
    "Delhi Technological University (DTU)",
    "National Institute of Design (NID)",
    "Jamia Millia Islamia",
    "Aligarh Muslim University",
    "Osmania University",
    "Amity University",
    "LPU (Lovely Professional University)",
  ].sort();

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "college") {
      if (value === "OTHER") {
        setShowOtherCollege(true);
        setFormData((prev) => ({ ...prev, [name]: "" }));
      } else {
        setShowOtherCollege(false);
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name] || (name === "otherCollege" && errors.college)) {
      setErrors((prev) => ({
        ...prev,
        [name === "otherCollege" ? "college" : name]: "",
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.age.trim()) newErrors.age = "Age is required";
    const collegeToSave = showOtherCollege
      ? formData.otherCollege
      : formData.college;
    if (!collegeToSave.trim()) newErrors.college = "College is required";
    if (!formData.field_of_study.trim())
      newErrors.field_of_study = "Field of Study is required";
    if (!formData.state) newErrors.state = "State is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onComplete({
      ...formData,
      college: showOtherCollege ? formData.otherCollege : formData.college,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-y-auto select-none touch-none"
      style={{ fontFamily: '"Inter", sans-serif' }}
    >
      <GameBackground harmony={50} />

      <div className="relative w-full max-w-lg z-10 animate-scale-in py-4 md:py-8">
        <div className="flex flex-col items-center mb-4 md:mb-6">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-3xl rounded-2xl md:rounded-[2rem] mb-4 md:mb-6 flex items-center justify-center border border-white/20 shadow-2xl overflow-hidden -rotate-6 transform hover:rotate-0 transition-all duration-700">
            <img
              src="/stickman_assets/logo.svg"
              alt="Words of Wisdome"
              className="w-10 h-10 md:w-12 md:h-12 object-contain"
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter text-center leading-none">
            Player <span className="text-teal-400">Profile</span>
          </h1>
          <p className="text-white/40 font-black uppercase tracking-[0.3em] text-[8px] md:text-[9px] mt-3 md:mt-4">
            India Edition
          </p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 p-6 md:p-10 rounded-3xl md:rounded-[3rem] shadow-4xl group transition-all duration-500 hover:border-teal-500/30">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[9px] font-black text-teal-400 uppercase tracking-widest ml-4">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your Name"
                className={`w-full bg-white/5 border-2 ${errors.name ? "border-red-500/50" : "border-white/5"} hover:border-teal-500/30 focus:border-teal-500 focus:outline-none text-white px-5 py-3.5 rounded-2xl transition-all placeholder:text-white/10 font-bold text-sm`}
              />
              {errors.name && (
                <p className="text-red-400 text-[9px] font-bold uppercase tracking-widest ml-4">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-teal-400 uppercase tracking-widest ml-4">
                  Age
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="Age"
                  className={`w-full bg-white/5 border-2 ${errors.age ? "border-red-500/50" : "border-white/5"} hover:border-teal-500/30 focus:border-teal-500 focus:outline-none text-white px-5 py-3.5 rounded-2xl transition-all placeholder:text-white/10 font-bold text-sm`}
                />
                {errors.age && (
                  <p className="text-red-400 text-[9px] font-bold uppercase tracking-widest ml-4">
                    {errors.age}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-teal-400 uppercase tracking-widest ml-4">
                  Country
                </label>
                <input
                  type="text"
                  value="India"
                  disabled
                  className="w-full bg-white/5 border-2 border-white/5 text-white/30 px-5 py-3.5 rounded-2xl font-bold text-sm cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-black text-teal-400 uppercase tracking-widest ml-4">
                Field of Study / Profession
              </label>
              <input
                type="text"
                name="field_of_study"
                value={formData.field_of_study}
                onChange={handleChange}
                placeholder="Student, Doctor, Teacher, etc."
                className={`w-full bg-white/5 border-2 ${errors.field_of_study ? "border-red-500/50" : "border-white/5"} hover:border-teal-500/30 focus:border-teal-500 focus:outline-none text-white px-5 py-3.5 rounded-2xl transition-all placeholder:text-white/10 font-bold text-sm`}
              />
              {errors.field_of_study && (
                <p className="text-red-400 text-[9px] font-bold uppercase tracking-widest ml-4">
                  {errors.field_of_study}
                </p>
              )}
            </div>

            <div className="space-y-1.5 transition-all duration-500">
              <label className="block text-[9px] font-black text-teal-400 uppercase tracking-widest ml-4">
                College / Institution
              </label>
              <div className="space-y-3">
                <select
                  name="college"
                  value={showOtherCollege ? "OTHER" : formData.college}
                  onChange={handleChange}
                  className={`w-full bg-slate-800/80 border-2 ${errors.college ? "border-red-500/50" : "border-white/5"} hover:border-teal-500/30 focus:border-teal-500 focus:outline-none text-white px-5 py-3.5 rounded-2xl transition-all font-bold text-sm appearance-none cursor-pointer`}
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 1.25rem center",
                    backgroundSize: "1rem",
                  }}
                >
                  <option value="" disabled>
                    Select your college
                  </option>
                  {MAJOR_COLLEGES.map((c) => (
                    <option
                      key={c}
                      value={c}
                      className="bg-slate-900 text-white"
                    >
                      {c}
                    </option>
                  ))}
                  <option
                    value="OTHER"
                    className="bg-slate-900 text-teal-400 font-black"
                  >
                    Other / Not Listed
                  </option>
                </select>

                {showOtherCollege && (
                  <div className="animate-slide-in-top">
                    <input
                      type="text"
                      name="otherCollege"
                      value={formData.otherCollege}
                      onChange={handleChange}
                      placeholder="Please enter your institution's name"
                      className="w-full bg-white/5 border-2 border-teal-500/30 text-white px-5 py-3.5 rounded-2xl transition-all placeholder:text-white/10 font-bold text-sm"
                    />
                  </div>
                )}
              </div>
              {errors.college && (
                <p className="text-red-400 text-[9px] font-bold uppercase tracking-widest ml-4">
                  {errors.college}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-black text-teal-400 uppercase tracking-widest ml-4">
                State / Territory
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className={`w-full bg-slate-800/80 border-2 ${errors.state ? "border-red-500/50" : "border-white/5"} hover:border-teal-500/30 focus:border-teal-500 focus:outline-none text-white px-5 py-3.5 rounded-2xl transition-all font-bold text-sm appearance-none cursor-pointer`}
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E\")",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 1.25rem center",
                  backgroundSize: "1rem",
                }}
              >
                <option value="" disabled className="text-white/20">
                  Select your state
                </option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s} className="bg-slate-900 text-white">
                    {s}
                  </option>
                ))}
              </select>
              {errors.state && (
                <p className="text-red-400 text-[9px] font-bold uppercase tracking-widest ml-4">
                  {errors.state}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="group relative w-full overflow-hidden bg-teal-500 text-white py-4 md:py-4.5 rounded-xl md:rounded-2xl font-black uppercase tracking-[0.2em] transition-all transform hover:scale-[1.03] active:scale-[0.98] shadow-2xl mt-2 md:mt-4"
            >
              <span className="relative z-10">Select Level</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlayerRegistrationScreen;
