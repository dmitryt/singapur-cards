import React from "react";
import { NavLink } from "react-router-dom";
import styled from "styled-components";
import { Icon } from "semantic-ui-react";
import { Divider } from "../atoms";

const Shell = styled.div`
  display: flex;
  height: 100vh;
  overflow: hidden;
`;

const Sidebar = styled.nav`
  width: ${({ theme }) => theme.sidebar.width};
  background-color: ${({ theme }) => theme.colors.secondary};
  color: white;
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.spacing.md} 0;
  flex-shrink: 0;
`;

const AppTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: bold;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const NavItems = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
`;

const NavItem = styled.li`
  a {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    font-size: ${({ theme }) => theme.fontSizes.sm};
    transition: background-color 0.15s ease, color 0.15s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
      color: white;
    }

    &.active {
      background-color: ${({ theme }) => theme.colors.primary};
      color: white;
    }
  }
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

interface AppShellProps {
  children: React.ReactNode;
}

function AppShell({ children }: AppShellProps) {
  return (
    <Shell>
      <Sidebar>
        <AppTitle>Singapur Cards</AppTitle>
        <NavItems>
          <NavItem>
            <NavLink
              to="/library"
              className={({ isActive }) => isActive ? "active" : ""}
            >
              <Icon name="book" />
              Library
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/collections"
              className={({ isActive }) => isActive ? "active" : ""}
            >
              <Icon name="folder" />
              Collections
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/review"
              className={({ isActive }) => isActive ? "active" : ""}
            >
              <Icon name="redo" />
              Practice
            </NavLink>
          </NavItem>
          <Divider />
          <NavItem>
            <NavLink
              to="/languages"
              className={({ isActive }) => isActive ? "active" : ""}
            >
              <Icon name="flag" />
              Languages
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/dictionaries"
              className={({ isActive }) => isActive ? "active" : ""}
            >
              <Icon name="list" />
              Dictionaries
            </NavLink>
          </NavItem>
          <Divider />
          <NavItem>
            <NavLink
              to="/chat"
              className={({ isActive }) => isActive ? "active" : ""}
            >
              <Icon name="chat" />
              AI Chat
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/models"
              className={({ isActive }) => isActive ? "active" : ""}
            >
              <Icon name="microchip" />
              Models
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to="/profile"
              className={({ isActive }) => isActive ? "active" : ""}
            >
              <Icon name="user" />
              Profile
            </NavLink>
          </NavItem>
        </NavItems>
      </Sidebar>
      <Content>{children}</Content>
    </Shell>
  );
}

export default AppShell;
