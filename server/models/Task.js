const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    software: {
      type: String,
      trim: true,
      default: '',
    },
    payroll: {
      type: String,
      enum: ['', 'MYOB', 'Quickbook', 'Xero', 'Reckon'],
      default: '',
    },
    properties: {
      type: [{
        address: {
          type: String,
          trim: true,
          required: true,
        },
        type: {
          type: String,
          enum: ['Primary', 'Investment'],
          default: 'Primary',
        },
      }],
      default: [],
    },
    motorVehicles: {
      type: [String],
      default: [],
    },
    outcomeAchieved: {
      type: [String],
      default: [],
    },
    assignDate: {
      type: String,
      default: '',
    },
    deadline: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'Lodged/Completed',
        'Out To Sign',
        'Singed',
        'Waiting for review',
        'Waiting client',
        'Sent query for Manager',
        'In Progress',
        'Initial Information Received',
        'On hold',
        'Sent Report to client',
      ],
      default: 'Initial Information Received',
    },
    completionDate: {
      type: Date,
    },
    statusHistory: [
      {
        status: String,
        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    auditLogs: [
      {
        action: String,
        actor: {
          type: String,
          default: 'User',
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changes: [
          {
            field: String,
            label: String,
            from: mongoose.Schema.Types.Mixed,
            to: mongoose.Schema.Types.Mixed,
          },
        ],
      },
    ],
    deleted: {
      type: Boolean,
      default: false,
    },
    // Keep compatibility with tasks created before `deleted` was introduced.
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    bufferCommands: false,
    timestamps: true,
  }
);

module.exports = mongoose.models.Task || mongoose.model('Task', taskSchema);
