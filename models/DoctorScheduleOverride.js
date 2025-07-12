const mongoose = require('mongoose');
const { Schema } = mongoose;


const timeSlotSchema = new Schema(
  {
    start: {
      type: String, // "HH:mm" format (e.g., "09:00")
      required: true,
    },
    end: {
      type: String, // "HH:mm" format (e.g., "12:00")
      required: true,
    },
  },
  { _id: false } // No need for _id on each timeslot
);

const doctorScheduleOverrideSchema = new Schema(
  {
    date: {
      type: String, // "YYYY-MM-DD" format
      required: true,
    },
    type: {
      type: String,
      enum: ["leave", "custom_time"],
      required: true,
    },
    timeSlots: {
      type: [timeSlotSchema],
      required: function () {
        return this.type === "custom_time";
      },
      validate: {
        validator: function (value) {
          if (this.type === "custom_time") {
            return Array.isArray(value) && value.length > 0;
          }
          return true;
        },
        message: "Custom time must have at least one time slot.",
      },
    },
  },
  {
    timestamps: true,
  }
);

const DoctorScheduleOverride = mongoose.model(
  "DoctorScheduleOverride",
  doctorScheduleOverrideSchema
);

module.exports = {
  DoctorScheduleOverride
};

