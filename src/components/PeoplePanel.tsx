"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createBlankPerson,
  validatePerson,
  type Person,
  type PersonSection,
} from "../lib/people";

type Props = {
  people: Person[];
  onSave: (person: Person) => Promise<void> | void;
  onDelete: (person: Person) => Promise<void> | void;
  onAddOccasion: (person: Person) => void;
  busy: boolean;
};

function newPerson(name: string): Person {
  const now = new Date().toISOString();
  return {
    ...createBlankPerson(name.trim()),
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
}

export default function PeoplePanel({
  people,
  onSave,
  onDelete,
  onAddOccasion,
  busy,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(people[0]?.id ?? "");
  const [draft, setDraft] = useState<Person | null>(people[0] ?? null);
  const [newName, setNewName] = useState("");
  const [openSections, setOpenSections] = useState<string[]>(
    people[0]?.sections.slice(0, 1).map((section) => section.id) ?? [],
  );
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [linkDrafts, setLinkDrafts] = useState<Record<string, { title: string; url: string }>>({});
  const [error, setError] = useState("");

  const filtered = useMemo(
    () => people.filter((person) => person.name.toLowerCase().includes(search.trim().toLowerCase())),
    [people, search],
  );

  useEffect(() => {
    const selected = people.find((person) => person.id === selectedId);
    if (selected) {
      setDraft(selected);
      return;
    }
    const first = people[0] ?? null;
    setSelectedId(first?.id ?? "");
    setDraft(first);
  }, [people, selectedId]);

  function selectPerson(person: Person) {
    setSelectedId(person.id);
    setDraft(person);
    setOpenSections(person.sections.slice(0, 1).map((section) => section.id));
    setError("");
  }

  async function save(person: Person) {
    setError("");
    try {
      const updated = validatePerson({
        ...person,
        updatedAt: new Date().toISOString(),
      });
      setDraft(updated);
      await onSave(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this person.");
    }
  }

  function updateSection(sectionId: string, update: Partial<PersonSection>) {
    if (!draft) return;
    setDraft({
      ...draft,
      sections: draft.sections.map((section) =>
        section.id === sectionId ? { ...section, ...update } : section,
      ),
    });
  }

  async function addLink(section: PersonSection) {
    if (!draft) return;
    const link = linkDrafts[section.id] ?? { title: "", url: "" };
    if (!link.title.trim() || !/^https:\/\/.+/i.test(link.url.trim())) {
      setError("Add a title and use a full https:// link.");
      return;
    }
    const updated = {
      ...draft,
      sections: draft.sections.map((item) =>
        item.id === section.id
          ? {
              ...item,
              links: [
                ...item.links,
                {
                  id: crypto.randomUUID(),
                  title: link.title.trim(),
                  url: link.url.trim(),
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : item,
      ),
    };
    setLinkDrafts((current) => ({ ...current, [section.id]: { title: "", url: "" } }));
    await save(updated);
  }

  if (people.length === 0 && !draft) {
    return (
      <section className="peopleEmpty emptyState">
        <h2>Add the people you buy gifts for</h2>
        <p>Keep interests, possible gifts, and shop links together for the next special occasion.</p>
        <form
          className="peopleAddForm"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!newName.trim()) return;
            const person = newPerson(newName);
            setSelectedId(person.id);
            setDraft(person);
            setNewName("");
            await save(person);
          }}
        >
          <input
            aria-label="Person name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="e.g. Sally"
            maxLength={100}
          />
          <button className="btn p" type="submit" disabled={busy || !newName.trim()}>
            Add person
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className={`peopleGrid ${draft ? "hasDetail" : ""}`}>
      <aside className="card peopleSidebar">
        <div className="peopleTitleRow">
          <div>
            <h2>People</h2>
            <small>Your private gift notes</small>
          </div>
          <span className="peopleCount">{people.length}</span>
        </div>
        <label className="peopleSearch">
          <span className="srOnly">Search people</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people"
          />
        </label>
        <div className="peopleList">
          {filtered.map((person) => (
            <button
              key={person.id}
              className={`personListButton ${selectedId === person.id ? "on" : ""}`}
              onClick={() => selectPerson(person)}
            >
              <span className="personInitial" aria-hidden="true">{person.name.charAt(0).toUpperCase()}</span>
              <span>
                <b>{person.name}</b>
                <small>{person.sections.length} note {person.sections.length === 1 ? "section" : "sections"}</small>
              </span>
            </button>
          ))}
          {filtered.length === 0 && <p className="off">No people match “{search}”.</p>}
        </div>
        <form
          className="peopleAddForm"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!newName.trim()) return;
            const person = newPerson(newName);
            setSelectedId(person.id);
            setDraft(person);
            setOpenSections([person.sections[0].id]);
            setNewName("");
            await save(person);
          }}
        >
          <input
            aria-label="New person name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Add someone"
            maxLength={100}
          />
          <button className="btn p" type="submit" disabled={busy || !newName.trim()}>
            Add
          </button>
        </form>
      </aside>

      {draft && (
        <article className="card personDetail">
          <button className="btn peopleBack" type="button" onClick={() => setDraft(null)}>
            ← All people
          </button>
          <div className="personDetailHeader">
            <label className="personNameField">
              <span className="srOnly">Person name</span>
              <input
                value={draft.name}
                maxLength={100}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                onBlur={(event) => save({ ...draft, name: event.currentTarget.value })}
              />
            </label>
            <button className="btn" type="button" onClick={() => onAddOccasion(draft)}>
              + Add birthday occasion
            </button>
          </div>
          <input
            className="personSummary"
            aria-label="Quick note"
            value={draft.notesSummary ?? ""}
            placeholder="A short note about them (optional)"
            maxLength={240}
            onChange={(event) => setDraft({ ...draft, notesSummary: event.target.value })}
            onBlur={(event) => save({ ...draft, notesSummary: event.currentTarget.value })}
          />

          <div className="personSections">
            {draft.sections.map((section) => {
              const open = openSections.includes(section.id);
              const linkDraft = linkDrafts[section.id] ?? { title: "", url: "" };
              return (
                <div className={`personSection ${open ? "open" : ""}`} key={section.id}>
                  <div className="personSectionHeading">
                    <button
                      type="button"
                      className="personSectionToggle"
                      aria-expanded={open}
                      onClick={() =>
                        setOpenSections((current) =>
                          open ? current.filter((id) => id !== section.id) : [...current, section.id],
                        )
                      }
                    >
                      <span className="sectionChevron" aria-hidden="true">›</span>
                      <span>{section.title}</span>
                      <small>{section.links.length ? `${section.links.length} links` : "Notes"}</small>
                    </button>
                    <button
                      className="sectionDelete"
                      type="button"
                      aria-label={`Delete ${section.title} section`}
                      disabled={draft.sections.length === 1 || busy}
                      title={draft.sections.length === 1 ? "Keep at least one section" : "Delete section"}
                      onClick={() =>
                        save({
                          ...draft,
                          sections: draft.sections.filter((item) => item.id !== section.id),
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                  {open && (
                    <div className="personSectionBody">
                      <label className="f">
                        Section name
                        <input
                          value={section.title}
                          maxLength={80}
                          onChange={(event) => updateSection(section.id, { title: event.target.value })}
                          onBlur={(event) =>
                            save({
                              ...draft,
                              sections: draft.sections.map((item) =>
                                item.id === section.id
                                  ? { ...item, title: event.currentTarget.value }
                                  : item,
                              ),
                            })
                          }
                        />
                      </label>
                      <label className="f">
                        Notes
                        <textarea
                          rows={4}
                          value={section.body ?? ""}
                          placeholder="Favorite colors, hobbies, sizes, ideas to remember…"
                          onChange={(event) => updateSection(section.id, { body: event.target.value })}
                          onBlur={(event) =>
                            save({
                              ...draft,
                              sections: draft.sections.map((item) =>
                                item.id === section.id
                                  ? { ...item, body: event.currentTarget.value }
                                  : item,
                              ),
                            })
                          }
                        />
                      </label>
                      {section.links.length > 0 && (
                        <ul className="personLinks">
                          {section.links.map((link) => (
                            <li key={link.id}>
                              <a href={link.url} target="_blank" rel="noopener noreferrer">{link.title} ↗</a>
                              <button
                                type="button"
                                aria-label={`Remove ${link.title}`}
                                onClick={() =>
                                  save({
                                    ...draft,
                                    sections: draft.sections.map((item) =>
                                      item.id === section.id
                                        ? { ...item, links: item.links.filter((savedLink) => savedLink.id !== link.id) }
                                        : item,
                                    ),
                                  })
                                }
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="personLinkForm">
                        <input
                          aria-label={`Link title for ${section.title}`}
                          value={linkDraft.title}
                          placeholder="Gift or shop name"
                          onChange={(event) =>
                            setLinkDrafts((current) => ({
                              ...current,
                              [section.id]: { ...linkDraft, title: event.target.value },
                            }))
                          }
                        />
                        <input
                          aria-label={`Link URL for ${section.title}`}
                          type="url"
                          value={linkDraft.url}
                          placeholder="https://…"
                          onChange={(event) =>
                            setLinkDrafts((current) => ({
                              ...current,
                              [section.id]: { ...linkDraft, url: event.target.value },
                            }))
                          }
                        />
                        <button className="btn" type="button" onClick={() => addLink(section)} disabled={busy}>
                          Add link
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <form
            className="newSectionForm"
            onSubmit={(event) => {
              event.preventDefault();
              if (!newSectionTitle.trim()) return;
              const section = {
                id: crypto.randomUUID(),
                title: newSectionTitle.trim(),
                body: "",
                links: [],
              };
              setNewSectionTitle("");
              setOpenSections((current) => [...current, section.id]);
              save({ ...draft, sections: [...draft.sections, section] });
            }}
          >
            <input
              aria-label="New section title"
              value={newSectionTitle}
              placeholder="New section, e.g. Sizes"
              onChange={(event) => setNewSectionTitle(event.target.value)}
            />
            <button className="btn" type="submit" disabled={busy || !newSectionTitle.trim()}>
              + Add section
            </button>
          </form>

          {error && <p className="err">{error}</p>}
          <div className="personDanger">
            <button
              className="btn d"
              type="button"
              disabled={busy}
              onClick={async () => {
                if (confirm(`Delete ${draft.name}? Their occasions will stay saved.`)) {
                  await onDelete(draft);
                }
              }}
            >
              Delete person
            </button>
          </div>
        </article>
      )}
    </section>
  );
}
