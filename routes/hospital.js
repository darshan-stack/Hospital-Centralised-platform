const express = require('express');
const { db } = require('../firebase');
const router = express.Router();

router.get('/dashboard', async (req, res) => {
  const patients = await db.collection('patients').get();
  const doctors = await db.collection('doctors').get();
  const revenue = await db.collection('revenue').get();
  res.json({ patients: patients.docs.length, doctors: doctors.docs.length, revenue });
});

router.get('/patient/:id', async (req, res) => {
  const patient = await db.collection('patients').doc(req.params.id).get();
  res.json(patient.data());
});

module.exports = router;