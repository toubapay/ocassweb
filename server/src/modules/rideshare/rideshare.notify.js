const notificationsService = require("../notifications/notifications.service");

/**
 * In-app notifications for a ride's whole lifecycle, written for BOTH
 * parties - the passenger who requested it and the rider (driver) who
 * accepted it off the open job board. Same shape and same reasoning as
 * delivery.notify.js next door; see the header there for why the copy is
 * per-side, why nothing is awaited, and why there is deliberately no
 * fan-out notification to every rider when a new ride appears.
 *
 * The vocabulary is this repo's, not Uber's: `RIDER` is the gig-work role
 * that drives (RideRequest.assignedRiderId, dashboard at
 * /ride-sharing/driver), and the customer riding along is the requester
 * (RideRequest.userId). Getting those two the wrong way round would put
 * the passenger's message in the driver's inbox.
 */

/** Whole francs, plain space separators - e.g. 12 500 FCFA. */
function fcfa(amount) {
  const digits = String(Math.round(Number(amount) || 0));
  return `${digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
}

function route(ride) {
  return `${ride.pickupAddress} → ${ride.dropoffAddress}`;
}

function send({ userId, type, title, body, rideId, role }) {
  if (!userId) return;
  notificationsService
    .notify({ userId, type, title, body, data: { rideRequestId: rideId, role } })
    .catch(() => {});
}

function notifyCreated(ride) {
  send({
    userId: ride.userId,
    type: "RIDE_REQUESTED",
    title: "Course demandée",
    body: `Recherche d'un chauffeur pour ${route(ride)}.`,
    rideId: ride.id,
    role: "CUSTOMER",
  });
}

function notifyAccepted(ride, rider) {
  const riderName = rider?.name || rider?.phone || "Un chauffeur";
  send({
    userId: ride.userId,
    type: "RIDE_ACCEPTED",
    title: "Chauffeur en route",
    body: `${riderName} vient vous chercher à ${ride.pickupAddress}.`,
    rideId: ride.id,
    role: "CUSTOMER",
  });
  // The fare, not the rider's share - see the same note in delivery.notify.js.
  send({
    userId: ride.assignedRiderId,
    type: "RIDE_JOB_ACCEPTED",
    title: "Course acceptée",
    body: `${route(ride)} · ${fcfa(ride.priceEstimate)}.`,
    rideId: ride.id,
    role: "RIDER",
  });
}

function notifyStarted(ride) {
  send({
    userId: ride.userId,
    type: "RIDE_IN_PROGRESS",
    title: "Course démarrée",
    body: `En route vers ${ride.dropoffAddress}.`,
    rideId: ride.id,
    role: "CUSTOMER",
  });
  send({
    userId: ride.assignedRiderId,
    type: "RIDE_JOB_IN_PROGRESS",
    title: "Course démarrée",
    body: `Destination : ${ride.dropoffAddress}.`,
    rideId: ride.id,
    role: "RIDER",
  });
}

/** `earnedAmount` is what was really credited, or null if nothing was. */
function notifyCompleted(ride, earnedAmount) {
  send({
    userId: ride.userId,
    type: "RIDE_COMPLETED",
    title: "Course terminée",
    body: `Arrivée à ${ride.dropoffAddress}. Merci d'avoir voyagé avec Ocass.`,
    rideId: ride.id,
    role: "CUSTOMER",
  });
  send({
    userId: ride.assignedRiderId,
    type: "RIDE_JOB_COMPLETED",
    title: "Course terminée",
    body: earnedAmount
      ? `${fcfa(earnedAmount)} crédités sur votre portefeuille.`
      : `Course terminée : ${route(ride)}.`,
    rideId: ride.id,
    role: "RIDER",
  });
}

function notifyCancelled(ride) {
  send({
    userId: ride.userId,
    type: "RIDE_CANCELLED",
    title: "Course annulée",
    body: `Votre course ${route(ride)} a été annulée.`,
    rideId: ride.id,
    role: "CUSTOMER",
  });
  send({
    userId: ride.assignedRiderId,
    type: "RIDE_JOB_CANCELLED",
    title: "Course annulée",
    body: `Le client a annulé la course ${route(ride)}.`,
    rideId: ride.id,
    role: "RIDER",
  });
}

module.exports = {
  notifyCreated,
  notifyAccepted,
  notifyStarted,
  notifyCompleted,
  notifyCancelled,
};
