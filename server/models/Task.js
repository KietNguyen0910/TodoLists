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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Task || mongoose.model('Task', taskSchema);
