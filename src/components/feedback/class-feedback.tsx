import { ActionButton } from "@/components/forms/action-button"
import { CopyLink } from "@/components/forms/copy-link"
import { FormDialog, type FormField } from "@/components/forms/form-dialog"
import { Download } from "@/components/icons"
import { RecordTable } from "@/components/shared/record-table"
import { EmailLinkButton } from "@/components/feedback/email-link-button"
import { deleteFeedback, saveFeedback, setFeedbackOpen, type FormValues } from "@/lib/actions"
import { formatDate } from "@/lib/format"
import type { ClassFeedback, ClassFeedbackRow } from "@/lib/frappe/types"

const QUESTIONS = [
  { field: "overall", label: "Overall" },
  { field: "instructor", label: "Instructor" },
  { field: "content", label: "Course content" },
  { field: "venue", label: "Venue and equipment" },
] as const

const score = (value?: number | null) => (value ? `${value} / 5` : "—")
const SCORES = [5, 4, 3, 2, 1].map((value) => ({ value: String(value), label: `${value}: ${["", "Poor", "Fair", "Good", "Very good", "Excellent"][value]}` }))

/** The questions on the paper form, for typing it in or correcting it. */
function answerFields(row?: ClassFeedbackRow): FormField[] {
  return [
    ...QUESTIONS.map((question): FormField => ({ name: question.field, label: question.label, type: "select", required: question.field === "overall", options: SCORES, initial: row?.[question.field] ? String(row[question.field]) : "" })),
    { name: "recommend", label: "Would recommend us", type: "select", options: [{ value: "Yes", label: "Yes" }, { value: "No", label: "No" }], initial: row?.recommend ?? "" },
    { name: "liked", label: "What went well", type: "textarea", initial: row?.liked ?? "" },
    { name: "improve", label: "What could be better", type: "textarea", initial: row?.improve ?? "" },
  ]
}

/** The class's feedback link and QR code to share with students, and what they said. */
export function ClassFeedbackSection({ batch, feedback, canEdit }: { batch: string; feedback: ClassFeedback; canEdit: boolean }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base">Student feedback</h2>
        <div className="flex flex-wrap gap-2">
        {canEdit && feedback.url && !feedback.closed && feedback.waiting.length > 0 && <EmailLinkButton batch={batch} waiting={feedback.waiting.length} />}
        {feedback.can_add && feedback.waiting.length > 0 && (
          <FormDialog
            title="Type in a paper feedback form"
            description="For students who filled in feedback on paper. Their answers are marked as typed in by staff."
            triggerLabel="Add paper form"
            trigger="add"
            success="Feedback added"
            fields={[
              { name: "trainee", label: "Student", type: "select", required: true, full: true, options: feedback.waiting.map((row) => ({ value: row.trainee, label: row.name })) },
              ...answerFields(),
            ]}
            action={async (values: FormValues) => {
              "use server"
              return saveFeedback({ ...values, training_batch: batch })
            }}
          />
        )}
        {canEdit && (
          <ActionButton
            variant="outline"
            size="sm"
            label={feedback.open ? "Stop taking feedback" : "Take feedback again"}
            success={feedback.open ? "Feedback closed" : "Feedback open"}
            action={setFeedbackOpen.bind(null, batch, !feedback.open)}
          />
        )}
        </div>
      </div>
      {feedback.average.overall !== null && feedback.average.overall < 3 && (
        <p role="status" className="rounded-xl bg-[#EB2239]/10 px-4 py-3 text-sm text-[#87000A]">Students rated this class {feedback.average.overall} out of 5 overall. Their comments below say why.</p>
      )}
      <div className="grid gap-5 rounded-2xl border border-[#E3E5F1] bg-white p-5 lg:grid-cols-[auto_minmax(0,1fr)]">
        {feedback.url ? (
          <div className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- a generated data URL, not a file to optimise */}
            <img src={feedback.qr} alt="QR code for this class's feedback page" width={180} height={180} className="rounded-lg border border-[#EEF0F8]" />
            <div className="flex flex-wrap justify-center gap-2">
              <CopyLink url={feedback.url} label="Copy link" copied="Feedback link copied. Paste it to the class." />
              <a href={feedback.qr} download={`feedback-${batch}.png`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E3E5F1] px-2.5 text-[13px] font-medium text-[#2E3094] hover:bg-[#F3F4FB]">
                <Download className="size-4" />
                QR code
              </a>
            </div>
          </div>
        ) : (
          <p className="max-w-56 text-sm text-[#6A6C8C]">The feedback link needs the portal&apos;s address set on the site (portal_url).</p>
        )}
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[#5E6182]">
            {feedback.closed ? <span className="font-medium text-[#755A00]">{feedback.closed} </span> : "Students scan the code or open the link, then confirm who they are with the phone number or email they registered with. "}
            {feedback.count} of {feedback.students} student{feedback.students === 1 ? "" : "s"} {feedback.count === 1 ? "has" : "have"} given feedback.
          </p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {QUESTIONS.map((question) => (
              <div key={question.field} className="rounded-xl bg-[#F7F8FC] px-3 py-2">
                <dt className="text-xs text-[#6A6C8C]">{question.label}</dt>
                <dd className="text-lg font-semibold tabular-nums">{score(feedback.average[question.field])}</dd>
              </div>
            ))}
            <div className="rounded-xl bg-[#F7F8FC] px-3 py-2">
              <dt className="text-xs text-[#6A6C8C]">Would recommend</dt>
              <dd className="text-lg font-semibold tabular-nums">{feedback.recommend === null ? "—" : `${feedback.recommend}%`}</dd>
            </div>
          </dl>
        </div>
      </div>
      {feedback.rows.length > 0 && (
        <RecordTable
          columns={[
            { header: "Student", cell: (row: ClassFeedbackRow) => <span className="flex flex-col">{row.trainee_name}<span className="text-xs text-[#6A6C8C]">{formatDate(row.submitted_on)}{row.source === "From a paper form" ? " · paper form" : ""}</span></span> },
            { header: "Overall", cell: (row: ClassFeedbackRow) => score(row.overall) },
            { header: "Instructor", cell: (row: ClassFeedbackRow) => score(row.instructor), wide: true },
            { header: "Content", cell: (row: ClassFeedbackRow) => score(row.content), wide: true },
            { header: "Venue", cell: (row: ClassFeedbackRow) => score(row.venue), wide: true },
            { header: "Recommend", cell: (row: ClassFeedbackRow) => row.recommend ?? "—" },
            {
              header: "Comments",
              cell: (row: ClassFeedbackRow) => (
                <span className="flex max-w-md flex-col gap-1 text-sm whitespace-pre-line">
                  {row.liked && <span><span className="text-[#6A6C8C]">Went well: </span>{row.liked}</span>}
                  {row.improve && <span><span className="text-[#6A6C8C]">Could be better: </span>{row.improve}</span>}
                  {!row.liked && !row.improve && "—"}
                </span>
              ),
            },
            ...(feedback.can_edit || feedback.can_delete
              ? [
                  {
                    header: "",
                    cell: (row: ClassFeedbackRow) => (
                      <span className="flex gap-1">
                        {feedback.can_edit && row.source === "From a paper form" && (
                          <FormDialog
                            title={`Correct ${row.trainee_name}'s paper form`}
                            triggerLabel="Edit"
                            trigger="edit"
                            success="Feedback updated"
                            fields={answerFields(row)}
                            action={async (values: FormValues) => {
                              "use server"
                              return saveFeedback({ ...values, name: row.name })
                            }}
                          />
                        )}
                        {feedback.can_delete && <ActionButton variant="ghost" size="sm" label="Delete" success="Feedback deleted" confirm={`Delete ${row.trainee_name}'s feedback? They can then give it again.`} action={deleteFeedback.bind(null, row.name)} />}
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
          rows={feedback.rows}
          rowKey={(row) => row.name}
          empty=""
        />
      )}
    </section>
  )
}
