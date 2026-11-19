import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import "./index.css";
import { AdminShell, EmployeeShell } from "./components/Shells";
import { DemoProvider } from "./lib/store";
import { AdminCompliance } from "./pages/AdminCompliance";
import { AdminLeave } from "./pages/AdminLeave";
import { AdminOverview } from "./pages/AdminOverview";
import { AdminPayroll } from "./pages/AdminPayroll";
import { AdminPeople } from "./pages/AdminPeople";
import { EmployeeHome, EmployeeLeave, EmployeePayslips, EmployeeProfile, EmployeeTax } from "./pages/Employee";
import { Landing } from "./pages/Landing";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-[28px] font-bold">This page isn't part of the demo</h1>
      <p className="mt-2 text-muted">Go back to the start and pick the HR admin or employee view.</p>
      <Link to="/" className="mt-6 inline-block font-semibold text-indigo underline">
        Back to start
      </Link>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DemoProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<AdminOverview />} />
            <Route path="people" element={<AdminPeople />} />
            <Route path="leave" element={<AdminLeave />} />
            <Route path="payroll" element={<AdminPayroll />} />
            <Route path="compliance" element={<AdminCompliance />} />
          </Route>
          <Route path="/me" element={<EmployeeShell />}>
            <Route index element={<EmployeeHome />} />
            <Route path="payslips" element={<EmployeePayslips />} />
            <Route path="leave" element={<EmployeeLeave />} />
            <Route path="tax" element={<EmployeeTax />} />
            <Route path="profile" element={<EmployeeProfile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DemoProvider>
  </StrictMode>,
);
