const notificationsService = require("../notifications/notifications.service");

/**
 * In-app notifications for a package delivery's whole lifecycle, written
 * for BOTH parties.
 *
 * A delivery has two people in it and they are not the same person: the
 * customer who requested it, and the delivery agent who accepted it off
 * the open job board. They need different sentences about the same event -
 * "your parcel has been picked up" is not "next stop: drop off at X" - so
 * every stage below has its own copy per side, and each notification is
 * addressed to one user id.
 *
 * Kept in its own module rather than inline in delivery.controller.js
 * because a delivery is also created by the restaurant module when an
 * order goes OUT_FOR_DELIVERY (dispatchForDelivery in
 * restaurant/orders.controller.js). Both create paths call notifyCreated
 * here, so a restaurant-dispatched delivery notifies exactly like a
 * standalone one instead of quietly skipping the customer's first message.
 *
 * Nothing here is awaited by a request handler and nothing here can throw
 * into one: notificationsService.notify() rejections are swallowed per
 * call, same rule as the Anando module - a notification that failed to
 * write must never fail the accept/pickup/delivery it describes, still
 * less the wallet credit next to it.
 *
 * Deliberately NOT here: a "new job available" notification fanned out to
 * every delivery agent. That is one row per agent per request, growing
 * with the size of the fleet, for something none of them may act on. The
 * open-job signal is the home screen's available-jobs badge (a count, see
 * countAvailable in delivery.controller.js) - the inbox is for jobs this
 * person is actually part of.
 */

/** Whole francs, plain space separators - e.g. 12 500 FCFA. */
function fcfa(amount) {
  const digits = String(Math.round(Number(amount) || 0));
  return `${digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
}

/** One leg of the journey, short enough to read in a notification list. */
function route(request) {
  return `${request.pickupAddress} → ${request.dropoffAddress}`;
}

/**
 * `data` is the freeform pointer the inbox uses to open the right screen
 * (see pages/notifications/index.js). `role` says which side of the job
 * this row belongs to, because the two land on different screens: the
 * customer opens the tracking page for that delivery, the agent opens
 * their job board.
 */
function send({ userId, type, title, body, requestId, role }) {
  if (!userId) return;
  notificationsService
    .notify({ userId, type, title, body, data: { deliveryRequestId: requestId, role } })
    .catch(() => {});
}

function notifyCreated(request) {
  send({
    userId: request.userId,
    type: "DELIVERY_REQUESTED",
    title: "Demande de livraison enregistrée",
    body: `Recherche d'un livreur pour ${route(request)}.`,
    requestId: request.id,
    role: "CUSTOMER",
  });
}

/** `agent` is the accepting user - their name is what the customer wants. */
function notifyAccepted(request, agent) {
  const agentName = agent?.name || agent?.phone || "Un livreur";
  send({
    userId: request.userId,
    type: "DELIVERY_ACCEPTED",
    title: "Livreur en route",
    body: `${agentName} vient récupérer votre colis à ${request.pickupAddress}.`,
    requestId: request.id,
    role: "CUSTOMER",
  });
  // The fare, not the agent's 80% share: the share is only computed when
  // the job completes (from the fee config as it stands then), so quoting
  // it now would be promising a figure that a rate change could move. The
  // fare is the same number the job board showed them before they tapped.
  send({
    userId: request.assignedAgentId,
    type: "DELIVERY_JOB_ACCEPTED",
    title: "Course acceptée",
    body: `${route(request)} · ${fcfa(request.priceEstimate)}.`,
    requestId: request.id,
    role: "AGENT",
  });
}

function notifyPickedUp(request) {
  send({
    userId: request.userId,
    type: "DELIVERY_PICKED_UP",
    title: "Colis récupéré",
    body: `Votre colis est en route vers ${request.dropoffAddress}.`,
    requestId: request.id,
    role: "CUSTOMER",
  });
  send({
    userId: request.assignedAgentId,
    type: "DELIVERY_JOB_PICKED_UP",
    title: "Colis récupéré",
    body: `Prochaine étape : livraison à ${request.dropoffAddress}.`,
    requestId: request.id,
    role: "AGENT",
  });
}

/**
 * `earnedAmount` is what was actually credited to the agent's wallet
 * (null when the request carried no price estimate, in which case nothing
 * was credited and the message must not claim otherwise).
 */
function notifyDelivered(request, earnedAmount) {
  send({
    userId: request.userId,
    type: "DELIVERY_DELIVERED",
    title: "Colis livré",
    body: request.receiverName
      ? `Votre colis a été remis à ${request.receiverName}.`
      : `Votre colis a été livré à ${request.dropoffAddress}.`,
    requestId: request.id,
    role: "CUSTOMER",
  });
  send({
    userId: request.assignedAgentId,
    type: "DELIVERY_JOB_COMPLETED",
    title: "Livraison terminée",
    body: earnedAmount
      ? `${fcfa(earnedAmount)} crédités sur votre portefeuille.`
      : `Course terminée : ${route(request)}.`,
    requestId: request.id,
    role: "AGENT",
  });
}

/**
 * Cancellation is only allowed while a request is still REQUESTED, so in
 * practice there is no agent to tell - the second send is a no-op on a
 * null assignedAgentId. It is written anyway rather than assumed away: if
 * cancellation ever opens up to an accepted job, the agent on their way
 * to a pickup is the person who most needs to hear about it.
 */
function notifyCancelled(request) {
  send({
    userId: request.userId,
    type: "DELIVERY_CANCELLED",
    title: "Livraison annulée",
    body: `Votre demande ${route(request)} a été annulée.`,
    requestId: request.id,
    role: "CUSTOMER",
  });
  send({
    userId: request.assignedAgentId,
    type: "DELIVERY_JOB_CANCELLED",
    title: "Course annulée",
    body: `Le client a annulé la course ${route(request)}.`,
    requestId: request.id,
    role: "AGENT",
  });
}

module.exports = {
  notifyCreated,
  notifyAccepted,
  notifyPickedUp,
  notifyDelivered,
  notifyCancelled,
};
