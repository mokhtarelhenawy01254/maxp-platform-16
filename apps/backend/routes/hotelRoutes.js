const express = require('express');
const router = express.Router();
const ctrl = require('../controller/hotelController');
const verifyToken = require('../utils/verifyToken');

// Properties
router.get('/properties', verifyToken.authenticateToken, ctrl.getProperties);
router.post('/properties', verifyToken.authenticateToken, ctrl.createProperty);
router.put('/properties/:id', verifyToken.authenticateToken, ctrl.updateProperty);
router.delete('/properties/:id', verifyToken.authenticateToken, ctrl.deleteProperty);

// Room Types
router.get('/room-types', verifyToken.authenticateToken, ctrl.getRoomTypes);
router.post('/room-types', verifyToken.authenticateToken, ctrl.createRoomType);
router.put('/room-types/:id', verifyToken.authenticateToken, ctrl.updateRoomType);
router.delete('/room-types/:id', verifyToken.authenticateToken, ctrl.deleteRoomType);

// Rooms
router.get('/rooms', verifyToken.authenticateToken, ctrl.getRooms);
router.post('/rooms', verifyToken.authenticateToken, ctrl.createRoom);
router.put('/rooms/:id', verifyToken.authenticateToken, ctrl.updateRoom);
router.delete('/rooms/:id', verifyToken.authenticateToken, ctrl.deleteRoom);
router.patch('/rooms/:id/status', verifyToken.authenticateToken, ctrl.updateRoomStatus);

// Availability
router.get('/availability', verifyToken.authenticateToken, ctrl.checkAvailability);

// Reservations
router.get('/reservations', verifyToken.authenticateToken, ctrl.getReservations);
router.get('/reservations/:id', verifyToken.authenticateToken, ctrl.getReservation);
router.post('/reservations', verifyToken.authenticateToken, ctrl.createReservation);
router.patch('/reservations/:id/status', verifyToken.authenticateToken, ctrl.updateReservationStatus);
router.put('/reservations/:id', verifyToken.authenticateToken, ctrl.updateReservation);
router.delete('/reservations/:id', verifyToken.authenticateToken, ctrl.deleteReservation);

// Folio
router.get('/reservations/:reservationId/folio', verifyToken.authenticateToken, ctrl.getFolioItems);
router.post('/reservations/:reservationId/folio', verifyToken.authenticateToken, ctrl.addFolioItem);
router.delete('/reservations/:reservationId/folio/:id', verifyToken.authenticateToken, ctrl.removeFolioItem);

// Seasonal Rates
router.get('/room-rates', verifyToken.authenticateToken, ctrl.getRoomRates);
router.post('/room-rates', verifyToken.authenticateToken, ctrl.createRoomRate);
router.delete('/room-rates/:id', verifyToken.authenticateToken, ctrl.deleteRoomRate);

module.exports = router;
