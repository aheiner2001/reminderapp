import type { WishlistItem } from "../lib/reminders";

interface WishlistReservationListProps {
  items: WishlistItem[];
  ownerUid: string;
  currentUid: string;
  onReservation: (
    itemId: string,
    action: "reserve" | "unreserve",
  ) => void | Promise<void>;
}

export default function WishlistReservationList({
  items,
  ownerUid,
  currentUid,
  onReservation,
}: WishlistReservationListProps) {
  const isOwner = ownerUid === currentUid;

  if (items.length === 0) {
    return <p className="off">This wishlist is empty.</p>;
  }

  return (
    <ul className="wishlist">
      {items.map((item) => {
        const isReserved = Boolean(item.reservedByUid);
        const isOwnReservation = item.reservedByUid === currentUid;
        return (
          <li
            key={item.id}
            className={`wishlistItem${isReserved ? " reserved" : ""}`}
          >
            <div className="grow">
              <b>{item.title}</b>
              {item.url && (
                <div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wishlistLink"
                  >
                    View item link ↗
                  </a>
                </div>
              )}
              {item.notes && <p className="wishlistNotes">{item.notes}</p>}
              {isReserved && (
                <span className="reservationStatus">
                  {isOwner ? "Someone reserved this" : "Reserved"}
                </span>
              )}
            </div>

            {!isOwner && !isReserved && (
              <button
                type="button"
                className="btn reservationButton"
                aria-label={`Reserve ${item.title}`}
                onClick={() => onReservation(item.id, "reserve")}
              >
                Reserve
              </button>
            )}
            {!isOwner && isOwnReservation && (
              <button
                type="button"
                className="btn reservationButton"
                aria-label={`Unreserve ${item.title}`}
                onClick={() => onReservation(item.id, "unreserve")}
              >
                Unreserve
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
